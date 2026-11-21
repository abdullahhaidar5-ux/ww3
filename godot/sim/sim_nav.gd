## Map grid, passability, line of sight, connected regions and A* route search.
## Translated from src/02-map.js (passC, passXY, los, nearestPass, nearestPassXY, wallCost, regions, nearestInRegion,
## findPath, bocc) and src/03-sim.js (smoothP). HOT PATH: every call here is a candidate for the C++ GDExtension
## (plain typed arrays in, plain arrays out, no Sim objects touched except through the bocc buffer).
extends RefCounted

const DOM_GROUND := 0
const DOM_NAVAL := 1
const DOM_AIR := 2

var CELL: int = 40
var GW: int = 0
var GH: int = 0
var MAPW: float = 0.0
var MAPH: float = 0.0
var grid: PackedByteArray        # 0 land, 1 water, 2 bridge/ford, 3 wall/building, 4 deep water ...
var bocc: PackedByteArray        # cells under standing buildings (route planning only, P_B)
var P_B: bool = false
var road_d: PackedByteArray = PackedByteArray()
var road_C: int = 0
var road_w: int = 0
var P_ROAD: bool = false
var wall_c: PackedFloat32Array
var reg_ground: PackedInt32Array
var reg_naval: PackedInt32Array
# A* scratch (typed arrays, reused: no allocations per search - same as the JS)
var P_g: PackedFloat32Array
var P_came: PackedInt32Array
var P_mark: PackedInt32Array
var P_closed: PackedInt32Array
var P_stamp: int = 1
var HF: PackedFloat32Array
var HI: PackedInt32Array
var last_iters: int = 0

func setup(m: Dictionary) -> void:
	CELL = int(m.CELL); GW = int(m.GW); GH = int(m.GH); MAPW = float(m.MAPW); MAPH = float(m.MAPH)
	grid = PackedByteArray(); grid.resize(GW * GH)
	var g: Array = m.grid
	for i in GW * GH: grid[i] = int(g[i])
	bocc = PackedByteArray(); bocc.resize(GW * GH)
	if m.get("road") != null:
		var rm: Dictionary = m.road
		road_C = int(rm.C); road_w = int(rm.w)
		road_d = PackedByteArray(); var d: Array = rm.d; road_d.resize(d.size())
		for i in d.size(): road_d[i] = 1 if d[i] else 0
	var n := GW * GH
	P_g = PackedFloat32Array(); P_g.resize(n)
	P_came = PackedInt32Array(); P_came.resize(n)
	P_mark = PackedInt32Array(); P_mark.resize(n)
	P_closed = PackedInt32Array(); P_closed.resize(n)
	HF = PackedFloat32Array(); HF.resize(n * 4)
	HI = PackedInt32Array(); HI.resize(n * 4)
	_wall_cost()
	reg_ground = _regions(DOM_GROUND)
	reg_naval = _regions(DOM_NAVAL)

static func dom_id(d: String) -> int:
	return DOM_AIR if d == "air" else (DOM_NAVAL if d == "naval" else DOM_GROUND)

func on_road(x: float, y: float) -> bool:
	if road_C == 0: return false
	var i := int(y / road_C) * road_w + int(x / road_C)
	return i >= 0 and i < road_d.size() and road_d[i] != 0

func pass_c(dom: int, cx: int, cy: int) -> bool:
	if cx < 0 or cy < 0 or cx >= GW or cy >= GH: return false
	var i := cy * GW + cx
	var v := grid[i]
	if dom == DOM_NAVAL: return v == 1 or v == 2 or v == 4
	if v != 0 and v != 2: return false
	return not (P_B and bocc[i] != 0)

func pass_xy(dom: int, x: float, y: float) -> bool:
	return dom == DOM_AIR or pass_c(dom, floori(x / CELL), floori(y / CELL))

func los(dom: int, x0: float, y0: float, x1: float, y1: float) -> bool:
	if dom == DOM_AIR: return true
	var n := ceili(sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)) / 16.0)
	for i in range(1, n + 1):
		var t := float(i) / n
		if not pass_xy(dom, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t): return false
	return true

## los with buildings blocking (losB in 03-sim: ground routes must not run through a base)
func los_b(dom: int, x0: float, y0: float, x1: float, y1: float) -> bool:
	if dom != DOM_GROUND: return los(dom, x0, y0, x1, y1)
	var pb := P_B; P_B = true
	var r := los(dom, x0, y0, x1, y1)
	P_B = pb
	return r

func nearest_pass(dom: int, cx: int, cy: int):
	if pass_c(dom, cx, cy): return Vector2i(cx, cy)
	for r in range(1, 16):
		for dy in range(-r, r + 1):
			for dx in range(-r, r + 1):
				if maxi(absi(dx), absi(dy)) != r: continue
				if pass_c(dom, cx + dx, cy + dy): return Vector2i(cx + dx, cy + dy)
	return null

func nearest_pass_xy(dom: int, x: float, y: float):
	var c = nearest_pass(dom, floori(x / CELL), floori(y / CELL))
	if c == null: return null
	if pass_xy(dom, x, y): return Vector2(x, y)
	return Vector2(c.x * CELL + CELL / 2.0, c.y * CELL + CELL / 2.0)

func _wall_cost() -> void:
	wall_c = PackedFloat32Array(); wall_c.resize(GW * GH)
	for yy in GH:
		for xx in GW:
			var i := yy * GW + xx
			if grid[i] != 0 and grid[i] != 2: continue
			var n := 0
			for dy in range(-1, 2):
				for dx in range(-1, 2):
					if dx == 0 and dy == 0: continue
					var X := xx + dx; var Y := yy + dy
					if X < 0 or Y < 0 or X >= GW or Y >= GH: n += 1; continue
					var v := grid[Y * GW + X]
					if v != 0 and v != 2: n += 1
			wall_c[i] = minf(0.9, n * 0.18)

func _pass_i(dom: int, i: int) -> bool:
	var v := grid[i]
	return (v == 1 or v == 2 or v == 4) if dom == DOM_NAVAL else (v == 0 or v == 2)

func _regions(dom: int) -> PackedInt32Array:
	var a := PackedInt32Array(); a.resize(GW * GH)
	var id := 0
	var st: Array[int] = []
	for i in a.size():
		if a[i] != 0 or not _pass_i(dom, i): continue
		id += 1; a[i] = id; st.append(i)
		while st.size() > 0:
			var c: int = st.pop_back()
			var cx := c % GW; var cy := c / GW
			for dy in range(-1, 2):
				for dx in range(-1, 2):
					if dx == 0 and dy == 0: continue
					var nx := cx + dx; var ny := cy + dy
					if nx < 0 or ny < 0 or nx >= GW or ny >= GH: continue
					var n := ny * GW + nx
					if a[n] != 0 or not _pass_i(dom, n): continue
					if dx != 0 and dy != 0 and (not _pass_i(dom, cy * GW + nx) or not _pass_i(dom, ny * GW + cx)): continue
					a[n] = id; st.append(n)
	return a

func regions(dom: int) -> PackedInt32Array:
	return reg_naval if dom == DOM_NAVAL else reg_ground

func region_at(dom: int, x: float, y: float) -> int:
	var cx := floori(x / CELL); var cy := floori(y / CELL)
	if cx < 0 or cy < 0 or cx >= GW or cy >= GH: return 0
	return regions(dom)[cy * GW + cx]

func nearest_in_region(R: PackedInt32Array, reg: int, gx: int, gy: int):
	for r in range(1, 90):
		var best := -1; var bd := 1e9
		for dy in range(-r, r + 1):
			for dx in range(-r, r + 1):
				if maxi(absi(dx), absi(dy)) != r: continue
				var xx := gx + dx; var yy := gy + dy
				if xx < 0 or yy < 0 or xx >= GW or yy >= GH: continue
				if R[yy * GW + xx] != reg: continue
				var d := dx * dx + dy * dy
				if d < bd: bd = d; best = yy * GW + xx
		if best >= 0: return Vector2i(best % GW, best / GW)
	return null

func _hfn(cx: int, cy: int, gx: int, gy: int) -> float:
	var dx := absi(cx - gx); var dy := absi(cy - gy)
	return dx + dy - 0.586 * mini(dx, dy)

## A* on the cell grid (binary heap on typed arrays). Returns [[x,y],...] already straightened, or null.
func find_path(dom: int, sx: float, sy: float, tx: float, ty: float):
	var s0 = nearest_pass(dom, floori(sx / CELL), floori(sy / CELL))
	var g0 = nearest_pass(dom, floori(tx / CELL), floori(ty / CELL))
	if s0 == null or g0 == null: return null
	var unreach := false
	if dom == DOM_GROUND or dom == DOM_NAVAL:
		var R := regions(dom)
		var rs := R[s0.y * GW + s0.x]
		if rs != 0 and R[g0.y * GW + g0.x] != rs:
			var qq = nearest_in_region(R, rs, g0.x, g0.y)
			if qq == null: return null
			g0 = qq; unreach = true
	P_stamp += 1
	var stp := P_stamp
	var start: int = s0.y * GW + s0.x
	var goal: int = g0.y * GW + g0.x
	var gx: int = g0.x; var gy: int = g0.y
	var HN := 0
	var use_wc := dom == DOM_GROUND
	var use_rd := P_ROAD and dom == DOM_GROUND and road_C > 0
	var best_n := start; var best_h := _hfn(s0.x, s0.y, gx, gy)
	var PN := GW * GH
	P_mark[start] = stp; P_g[start] = 0.0; P_came[start] = -1
	# push
	HF[0] = best_h; HI[0] = start; HN = 1
	var it := 0; var found := false
	var lim := maxi(9000, int(PN * 0.45))
	while HN > 0 and it < lim and HN < PN * 4 - 8:
		it += 1
		# pop
		var cur := HI[0]
		HN -= 1
		if HN > 0:
			var f := HF[HN]; var vv := HI[HN]; var k := 0
			while true:
				var l := 2 * k + 1; var rr := l + 1; var m := -1; var mf := f
				if l < HN and HF[l] < mf: m = l; mf = HF[l]
				if rr < HN and HF[rr] < mf: m = rr
				if m < 0: break
				HF[k] = HF[m]; HI[k] = HI[m]; k = m
			HF[k] = f; HI[k] = vv
		if P_closed[cur] == stp: continue
		P_closed[cur] = stp
		if cur == goal: found = true; break
		var cx := cur % GW; var cy := cur / GW
		var hh := _hfn(cx, cy, gx, gy)
		if hh < best_h: best_h = hh; best_n = cur
		for dy in range(-1, 2):
			for dx in range(-1, 2):
				if dx == 0 and dy == 0: continue
				var nx := cx + dx; var ny := cy + dy
				if not pass_c(dom, nx, ny): continue
				if dx != 0 and dy != 0 and (not pass_c(dom, cx + dx, cy) or not pass_c(dom, cx, cy + dy)): continue
				var ni := ny * GW + nx
				if P_closed[ni] == stp: continue
				var ng := P_g[cur] + (1.414 if (dx != 0 and dy != 0) else 1.0) * ((1.0 + wall_c[ni]) if use_wc else 1.0) * (0.7 if (use_rd and on_road(nx * CELL + CELL / 2.0, ny * CELL + CELL / 2.0)) else 1.0)
				if P_mark[ni] != stp or ng < P_g[ni]:
					P_mark[ni] = stp; P_g[ni] = ng; P_came[ni] = cur
					# push(ng + h, ni)
					var fpush := ng + _hfn(nx, ny, gx, gy)
					var k2 := HN; HN += 1
					while k2 > 0:
						var p := (k2 - 1) >> 1
						if HF[p] <= fpush: break
						HF[k2] = HF[p]; HI[k2] = HI[p]; k2 = p
					HF[k2] = fpush; HI[k2] = ni
	last_iters = it
	var end := goal
	if not found:
		if best_n == start or best_h > _hfn(s0.x, s0.y, gx, gy) - 2: return null
		end = best_n
	var cells: Array[int] = []
	var c := end
	while c != -1:
		cells.append(c); c = P_came[c]
	cells.reverse()
	var pts: Array = []
	for cc in cells: pts.append([(cc % GW) * CELL + CELL / 2.0, (cc / GW) * CELL + CELL / 2.0])
	if found and not unreach and pass_xy(dom, tx, ty): pts[pts.size() - 1] = [tx, ty]
	var out: Array = []
	var ax := sx; var ay := sy; var i := 0
	while i < pts.size():
		var j := pts.size() - 1
		while j > i and not los(dom, ax, ay, pts[j][0], pts[j][1]): j -= 1
		out.append(pts[j]); ax = pts[j][0]; ay = pts[j][1]; i = j + 1
	return out

## smoothP (03-sim): skip waypoints that are in direct line of sight
func smooth_p(dom: int, x0: float, y0: float, P):
	if P == null or P.size() < 3: return P
	var out: Array = []
	var cx := x0; var cy := y0; var i := 0
	while i < P.size():
		var j := mini(P.size() - 1, i + 14)
		while j > i and not los(dom, cx, cy, P[j][0], P[j][1]): j -= 1
		out.append(P[j]); cx = P[j][0]; cy = P[j][1]; i = j + 1
	return out
