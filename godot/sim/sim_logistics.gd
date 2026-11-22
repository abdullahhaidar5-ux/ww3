## SUPPLY LINES — the road network, craters, bridges, checkpoints, road capture (lane P1).
## Translated 1:1 from src/03c-logistics.js (same constants, same order of work, no random numbers).
##   lgInit -> setup · lgDyn -> dyn · lgLinks -> links · lgCompute -> compute · lgCuts -> cuts · lgCover -> cover
##   lgCoverSig -> cover_sig · lgBlk -> blk · lgTick -> tick · lgRoadCap -> road_cap · lgBlast -> blast
##   lgBridgeDown / lgBrApply / lgBridges -> bridge_down / br_apply / bridges_tick · lgCkTick -> ck_tick
##   lgMines -> mines · lgCmd -> cmd · lgDoze -> doze · lgDone -> job_done · lgAI2 -> ai
## Not ported (their systems are not in the Godot sim): roads built by engineers to a forward depot (droad / jobs,
## needs roadRoute), pontoon bridges, airlift, ports + blockade (navy), rubble on roads.
## Read-only data for the renderer / minimap (see orch/HANDOFF-gport-p1.md):
##   E[i].pts            road polylines [[x,y],..]         cov[team][i] = {v:[[s0,s1]..] covered, d:[[s0,s1]..] cut}
##   bead[team]          Vector3(x,y,r) circles along the covered roads (the road part of "your area")
##   cr {edge: {x,y,t}}  craters (gone when t <= sim.t)    bridges[i] {x,y,h,n,t,a,b,dead}   bd {i: {hp,dead,ch}}
##   ck [{id,team,x,y,ei,dg}] checkpoints                  mn [{id,team,x,y}] road mines    rc {edge: {o,c,p}} road capture
##   lgv                 goes up whenever any of that changed (redraw then)
extends RefCounted

const E = preload("res://sim/sim_ent.gd")

const LG_REACH := 1500.0
const LG_ROADW := 120.0
const LG_CRATER_T := 150.0
const LG_CRATER_HP := 240.0
const LG_ATTACH := 260.0
const LG_CUTR := 55.0
const LG_RCT := 10.0
const LGC := {mine = 100, ckpt = 250, demo = 200, fixb = 500}
const LGT := {mine = 3, ckpt = 8, demo = 4, fixb = 40}
const LG_MINE_MAX := 8
const LG_CK_MAX := 3
const LG_CHG := 30.0
const NO_SRC := ["hq", "depot", "shipyard", "wall", "gate", "mine", "garrison", "tunnel"]

var S                       # the Sim
var N: Array = []           # nodes {x, y, b, e, tm}
var E_: Array = []          # edges (kept as E_ inside; `E` is the entity class) — exposed as `edges`
var edges: Array:
	get: return E_
var n0: int = 0
var nS: int = 0
var en: Dictionary = {}
var dsig: String = ""
var dl: Array = []
var reach = null            # Array of PackedByteArray / null per team
var trade = null
var sig: String = ""
var cov = null              # Array (per team) of Dictionary edge -> {v, d}
var bead = null             # Array (per team) of Array[Vector3]
var csig: String = ""
var cvs = null
var cv_t: float = 0.0
var rc_a: float = 0.0
var lgv: int = 0
var bridges: Array = []
var bv_a: int = 0
# dynamic state (JS G.lgd)
var v: int = 0
var cr: Dictionary = {}
var dm: Dictionary = {}
var d_id: int = 1
var mn: Array = []
var ck: Array = []
var bd: Dictionary = {}
var bv: int = 0
var rc: Dictionary = {}
# lgProj result (no allocation)
var pd: float = 0.0
var ps: float = 0.0
var px: float = 0.0
var py: float = 0.0
var pa: float = 0.0
var _nb: Array = []

func _init(sim) -> void:
	S = sim

static func hyp(x: float, y: float) -> float:
	return sqrt(x * x + y * y)

static func skeys(d: Dictionary) -> Array:
	var k := d.keys(); k.sort(); return k

func setup(map: Dictionary) -> void:
	var L = map.get("lg")
	if L != null:
		for n in L.N: N.append({x = float(n.x), y = float(n.y), b = int(n.b), e = 0, tm = -1})
		for e in L.E:
			var pts: Array = []
			for p in e.pts: pts.append([float(p[0]), float(p[1])])
			E_.append(mk_edge(int(e.a), int(e.b), pts, -1))
	for b in map.get("bridges", []):
		var cells := PackedInt32Array()
		for c in b.cells: cells.append(int(c))
		bridges.append({x = float(b.x), y = float(b.y), h = float(b.h), n = [float(b.n[0]), float(b.n[1])], t = [float(b.t[0]), float(b.t[1])],
			a = [float(b.a[0]), float(b.a[1])], b = [float(b.b[0]), float(b.b[1])], cells = cells, dead = false})
	n0 = E_.size(); nS = N.size()
	links()

func mk_edge(a: int, b: int, pts: Array, team: int) -> Dictionary:
	var cum: Array = [0.0]
	var x0 := 1e9; var y0 := 1e9; var x1 := -1e9; var y1 := -1e9
	for i in pts.size():
		if i: cum.append(cum[i - 1] + hyp(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
		x0 = minf(x0, pts[i][0]); y0 = minf(y0, pts[i][1]); x1 = maxf(x1, pts[i][0]); y1 = maxf(y1, pts[i][1])
	return {a = a, b = b, pts = pts, cum = cum, len = cum[cum.size() - 1], team = team, bb = [x0, y0, x1, y1], br = []}

## closest point of a road polyline -> pd (distance), ps (road position), px/py, pa (direction)
func proj(e: Dictionary, x: float, y: float) -> void:
	var P: Array = e.pts
	var bdd := 1e18; var bs := 0.0; var bx := 0.0; var by := 0.0; var ba := 0.0
	for j in range(1, P.size()):
		var ax: float = P[j - 1][0]; var ay: float = P[j - 1][1]
		var dx: float = P[j][0] - ax; var dy: float = P[j][1] - ay
		var l2 := dx * dx + dy * dy
		if l2 == 0: l2 = 1.0
		var f := clampf(((x - ax) * dx + (y - ay) * dy) / l2, 0.0, 1.0)
		var qx := ax + dx * f; var qy := ay + dy * f
		var d := hyp(qx - x, qy - y)
		if d < bdd: bdd = d; bs = e.cum[j - 1] + sqrt(l2) * f; bx = qx; by = qy; ba = atan2(dy, dx)
	pd = bdd; ps = bs; px = bx; py = by; pa = ba

## lgPoint: the point at road position s of a polyline
func point(e: Dictionary, s: float) -> Vector2:
	var P: Array = e.pts
	var acc := 0.0
	for i in range(1, P.size()):
		var L := hyp(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])
		if acc + L >= s:
			var f := (s - acc) / L if L > 0 else 0.0
			return Vector2(P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f)
		acc += L
	return Vector2(P[P.size() - 1][0], P[P.size() - 1][1])

func edge_br(e: Dictionary) -> Array:
	var o: Array = []
	for i in bridges.size():
		var b: Dictionary = bridges[i]; var bb: Array = e.bb; var m: float = b.h + 50
		if b.x < bb[0] - m or b.x > bb[2] + m or b.y < bb[1] - m or b.y > bb[3] + m: continue
		var P: Array = e.pts; var hit := false
		for j in range(1, P.size()):
			if hit: break
			var L := hyp(P[j][0] - P[j - 1][0], P[j][1] - P[j - 1][1]); var k := maxi(1, ceili(L / 16))
			for q in k + 1:
				var x: float = P[j - 1][0] + (P[j][0] - P[j - 1][0]) * q / k; var y: float = P[j - 1][1] + (P[j][1] - P[j - 1][1]) * q / k
				var dx: float = x - b.x; var dy: float = y - b.y
				if absf(dx * b.t[0] + dy * b.t[1]) < 40 and absf(dx * b.n[0] + dy * b.n[1]) < b.h - 20: hit = true; break
		if hit: o.append(i)
	return o

## implicit links of depot nodes: to both ends of any road passing within 240, and to bases / junctions within 320
func links() -> void:
	dl = []; dl.resize(N.size())
	for e in E_: e.br = edge_br(e)
	for j in range(nS, N.size()):
		var nd: Dictionary = N[j]; var o: Array = []
		for i in E_.size():
			var e: Dictionary = E_[i]; var b: Array = e.bb
			if e.a == e.b or e.a == j or e.b == j: continue
			if nd.x < b[0] - 240 or nd.x > b[2] + 240 or nd.y < b[1] - 240 or nd.y > b[3] + 240: continue
			proj(e, nd.x, nd.y)
			if pd < 240: o.append([e.a, i]); o.append([e.b, i])
		for m in nS:
			if hyp(N[m].x - nd.x, N[m].y - nd.y) < 320: o.append([m, -1])
		dl[j] = o

## dynamic nodes: finished Supply Depots (rebuilt only when that set changes)
func dyn() -> void:
	var list: Array = []
	for e in S.ents:
		if e.dead or not e.is_b or e.kind != "depot" or e.built < 1.0 or e.team < 0 or e.team >= S.teams.size(): continue
		list.append(e)
	list.sort_custom(func(a, b): return a.id < b.id)
	var sg := ""
	for e in list: sg += str(e.id) + ","
	if sg == dsig: return
	dsig = sg; N.resize(nS); en = {}
	for e in list:
		N.append({x = e.x, y = e.y, b = -1, e = e.id, tm = e.team}); en[e.id] = N.size() - 1
	links(); sig = ""

func node_own(n: Dictionary, k: int) -> bool:
	if n.e: return S.ally(n.tm, k)
	if n.b >= 0: return n.b < S.teams.size() and S.ally(n.b, k) and not S.teams[n.b].out
	return false

func node_foe(n: Dictionary, k: int) -> bool:
	if n.e: return not S.ally(n.tm, k)
	if n.b >= 0: return n.b != k and n.b < S.teams.size() and not S.ally(n.b, k) and not S.teams[n.b].out
	return false

## is road i closed for team k: cratered, over a blown bridge, or held by an enemy checkpoint
func blk(i: int, k: int) -> bool:
	var c = cr.get(i)
	if c != null and c.t > S.t: return true
	if i < E_.size():
		for b in E_[i].br:
			if bridges[b].dead: return true
	for q in ck:
		if q.ei == i and not S.ally(q.team, k): return true
	return false

func rc_foe(i: int, k: int) -> bool:
	var q = rc.get(i)
	return q != null and q.o >= 0 and q.o < S.teams.size() and not S.ally(q.o, k)

func rc_owner(i: int) -> int:
	var q = rc.get(i)
	if q != null and q.o >= 0: return q.o
	if cov != null:
		for k in cov.size():
			if cov[k] != null:
				var c = cov[k].get(i)
				if c != null and c.v.size(): return k
	return -1

## reach (over neutral nodes too) and trade (own nodes only) per team; marks cut-off depots (e.lcut)
func compute() -> void:
	var n := N.size(); var Nt: int = S.teams.size()
	reach = []; trade = []
	var adj: Array = []
	for i in n: adj.append([])
	for i in E_.size():
		var e: Dictionary = E_[i]
		if e.a != e.b: adj[e.a].append([e.b, i]); adj[e.b].append([e.a, i])
	for j in range(nS, n):
		for l in dl[j]:
			if j != l[0]: adj[j].append([l[0], l[1]]); adj[l[0]].append([j, l[1]])
	for k in Nt:
		if S.teams[k].out: reach.append(null); trade.append(null); continue
		for mode in 2:
			var seen := PackedByteArray(); seen.resize(n)
			var q: Array = []
			for i in n:
				var nd: Dictionary = N[i]
				if nd.b >= 0 and node_own(nd, k): seen[i] = 1; q.append(i)
			while q.size():
				var i: int = q.pop_back()
				for l in adj[i]:
					var j: int = l[0]; var ei: int = l[1]
					if seen[j]: continue
					if ei >= 0 and blk(ei, k): continue
					var nd2: Dictionary = N[j]
					if (not node_own(nd2, k)) if mode else node_foe(nd2, k): continue
					seen[j] = 1; q.append(j)
			if mode: trade.append(seen)
			else: reach.append(seen)
	for j in range(nS, n):
		var nd3: Dictionary = N[j]; var e = S.by_id.get(nd3.e)
		if e == null: continue
		var r = reach[nd3.tm]
		e.lcut = 1 if (r != null and not r[j]) else 0
	cover(); lgv += 1

## enemy ground units standing on a road cut it: for team k, edge -> sorted road positions of the cuts
func cuts(k: int) -> Dictionary:
	var out := {}
	for u in S.ents:
		if u.dead or u.is_b or u.in_tun or u.team < 0 or u.s_dom != "ground" or u.s_no_attack or u.kind == "harv" or u.kind == "dozer" or S.ally(u.team, k): continue
		for i in E_.size():
			var e: Dictionary = E_[i]; var b: Array = e.bb
			if u.x < b[0] - LG_CUTR or u.x > b[2] + LG_CUTR or u.y < b[1] - LG_CUTR or u.y > b[3] + LG_CUTR: continue
			proj(e, u.x, u.y)
			if pd < LG_CUTR:
				if not out.has(i): out[i] = []
				out[i].append(ps)
	for i in out: out[i].sort()
	return out

static func iv_add(L: Array, a: float, b: float) -> void:
	if b - a < 1: return
	L.append([a, b])

static func iv_norm(L: Array) -> Array:
	if L.size() < 2: return L
	L.sort_custom(func(p, q): return p[0] < q[0])
	var o: Array = [L[0].duplicate()]
	for i in range(1, L.size()):
		var t: Array = o[o.size() - 1]
		if L[i][0] <= t[1] + 1: t[1] = maxf(t[1], L[i][1])
		else: o.append(L[i].duplicate())
	return o

# walk edge ei from road position s0 in direction dir (+1 = toward end b) with budget r: what is left at the far end, or -1
func _walk(k: int, C: Dictionary, cut: Dictionary, ei: int, s0: float, dir: int, r: float) -> float:
	var e: Dictionary = E_[ei]; var len_: float = e.len
	if not C.has(ei): C[ei] = {v = [], d = []}
	var c: Dictionary = C[ei]
	if blk(ei, k) or rc_foe(ei, k):
		var a := minf(r, (len_ - s0) if dir > 0 else s0)
		iv_add(c.d, s0 if dir > 0 else s0 - a, (s0 + a) if dir > 0 else s0)
		return -1.0
	var lim := len_ if dir > 0 else 0.0
	for x in cut.get(ei, []):
		if dir > 0 and x > s0 + 1: lim = x; break
		if dir < 0 and x < s0 - 1: lim = x
	var room := (lim - s0) if dir > 0 else (s0 - lim); var go := minf(r, room)
	iv_add(c.v, s0 if dir > 0 else s0 - go, (s0 + go) if dir > 0 else s0)
	if go < r and lim != (len_ if dir > 0 else 0.0):
		var more := minf(r - go, (len_ - lim) if dir > 0 else lim)
		iv_add(c.d, lim if dir > 0 else lim - more, (lim + more) if dir > 0 else lim)
		return -1.0
	return (r - room) if go >= room else -1.0

## SUPPLY LINES per team: cov[k][edge] = {v: covered stretches, d: cut stretches}, bead[k] = circles along the covered road
func cover() -> void:
	var n := N.size(); var Nt: int = S.teams.size()
	var adj: Array = []
	for i in n: adj.append([])
	cov = []; bead = []
	for i in E_.size():
		var e: Dictionary = E_[i]
		if e.a == e.b: continue
		adj[e.a].append([e.b, i, 0]); adj[e.b].append([e.a, i, 1])
	for k in Nt:
		if S.teams[k].out or reach == null: cov.append(null); bead.append(null); continue
		var left := PackedFloat64Array(); left.resize(n); left.fill(-1.0)
		var C := {}; var cut := cuts(k)
		# node sources: the base (while its Command Center stands) and own depots
		for i in n:
			var nd: Dictionary = N[i]
			if not node_own(nd, k): continue
			var r := 0.0
			if nd.b >= 0:
				for e in S.ents:
					if e.kind == "hq" and not e.dead and e.built >= 1.0 and S.ally(e.team, k) and hyp(e.x - nd.x, e.y - nd.y) < 700: r = LG_REACH; break
			elif nd.e:
				var e = S.by_id.get(nd.e)
				if e != null and not e.dead: r = LG_REACH * (0.5 if e.lcut else 1.0)
			if r > left[i]: left[i] = r
		# building / held map-building sources: the nearest road within LG_ATTACH, covered both ways from the closest point
		var src: Array = []
		for e in S.ents:
			if e.dead or not e.is_b or e.built < 1.0 or e.team < 0 or not S.ally(e.team, k) or NO_SRC.has(e.kind): continue
			src.append(Vector2(e.x, e.y))
		for o in S.oil:
			if not o.dead and o.owner >= 0 and S.ally(o.owner, k): src.append(Vector2(o.x, o.y))
		for b in src:
			var bdd := LG_ATTACH; var bi := -1; var b_s := 0.0
			for i in E_.size():
				var e: Dictionary = E_[i]; var q0: Array = e.bb
				if b.x < q0[0] - LG_ATTACH or b.x > q0[2] + LG_ATTACH or b.y < q0[1] - LG_ATTACH or b.y > q0[3] + LG_ATTACH: continue
				proj(e, b.x, b.y)
				if pd < bdd: bdd = pd; bi = i; b_s = ps
			if bi < 0: continue
			var e2: Dictionary = E_[bi]
			var ra := _walk(k, C, cut, bi, b_s, -1, LG_REACH); var rb := _walk(k, C, cut, bi, b_s, 1, LG_REACH)
			if ra > left[e2.a] and not node_foe(N[e2.a], k): left[e2.a] = ra
			if rb > left[e2.b] and not node_foe(N[e2.b], k): left[e2.b] = rb
		# captured road sections: a section a side holds is its supply area whole, and passes half a reach on past both ends
		for ei in skeys(rc):
			var q: Dictionary = rc[ei]
			if not (q.o >= 0) or not S.ally(q.o, k): continue
			if ei >= E_.size(): continue
			var e3: Dictionary = E_[ei]
			if e3.a == e3.b or blk(ei, k): continue
			var ra2 := _walk(k, C, cut, ei, e3.len, -1, e3.len + LG_REACH * 0.5); var rb2 := _walk(k, C, cut, ei, 0.0, 1, e3.len + LG_REACH * 0.5)
			if ra2 > left[e3.a] and not node_foe(N[e3.a], k): left[e3.a] = ra2
			if rb2 > left[e3.b] and not node_foe(N[e3.b], k): left[e3.b] = rb2
		# spread over the network, farthest budget first
		var done := PackedByteArray(); done.resize(n)
		while true:
			var b2 := -1; var bvv := 0.0
			for i in n:
				if not done[i] and left[i] > bvv: bvv = left[i]; b2 = i
			if b2 < 0: break
			done[b2] = 1
			for l in adj[b2]:
				var j: int = l[0]; var ei2: int = l[1]; var rev: int = l[2]
				var e4: Dictionary = E_[ei2]
				var rest := _walk(k, C, cut, ei2, e4.len if rev else 0.0, -1 if rev else 1, bvv)
				if rest > 0 and not node_foe(N[j], k) and rest > left[j]: left[j] = rest; done[j] = 0
		var bd_: Array = []
		for ei3 in skeys(C):
			var c: Dictionary = C[ei3]
			c.v = iv_norm(c.v); c.d = iv_norm(c.d)
			var e5: Dictionary = E_[ei3]; var cm: Array = e5.cum; var P: Array = e5.pts
			for iv in c.v:
				var s: float = iv[0]
				while s <= iv[1] + 0.5:
					var m := 1
					while m < cm.size() - 1 and cm[m] < s: m += 1
					var f := clampf((s - cm[m - 1]) / (cm[m] - cm[m - 1]), 0.0, 1.0) if cm[m] > cm[m - 1] else 0.0
					bd_.append(Vector3(P[m - 1][0] + (P[m][0] - P[m - 1][0]) * f, P[m - 1][1] + (P[m][1] - P[m - 1][1]) * f, LG_ROADW))
					s += LG_ROADW
		cov.append(C); bead.append(bd_)
	var sg := ""
	for k in Nt:
		var C2 = cov[k]
		if C2 == null: continue
		for ei in skeys(C2):
			var c2: Dictionary = C2[ei]
			sg += "%d:%d:" % [k, ei]
			for q2 in c2.v: sg += "%d-%d," % [int(q2[0]), int(q2[1])]
			sg += "/%d;" % c2.d.size()
	if sg != csig: csig = sg; lgv += 1

## cheap test: has anything that moves the supply lines changed since the last cover()?
func cover_sig() -> String:
	var s := PackedStringArray()
	for e in S.ents:
		if e.dead: continue
		if e.is_b:
			if e.built >= 1.0: s.append("b%d" % e.id)
			continue
		if e.s_dom != "ground" or e.in_tun or e.s_no_attack: continue
		for i in E_.size():
			var b: Array = E_[i].bb
			if e.x < b[0] - LG_CUTR or e.x > b[2] + LG_CUTR or e.y < b[1] - LG_CUTR or e.y > b[3] + LG_CUTR: continue
			proj(E_[i], e.x, e.y)
			if pd < LG_CUTR: s.append("u%d:%d:%d" % [e.team, i, int(ps / 60)])
	for o in S.oil: s.append("x" if o.dead else str(o.owner + 1))
	for i in skeys(rc): s.append("r%d:%d" % [i, rc[i].o])
	return ",".join(s)

## every half second (from Sim.upd_supply)
func tick(st: float) -> void:
	dyn(); bridges_tick(st); ck_tick()
	# craters heal on their own, six times faster with a construction vehicle next to them
	for k in skeys(cr):
		var c: Dictionary = cr[k]; var rate := 1.0
		for e in S.ents:
			if e.kind == "dozer" and not e.dead and not e.in_tun and hyp(e.x - c.x, e.y - c.y) < 170: rate = 6.0; break
		c.t -= (rate - 1) * st
		if c.t <= S.t: cr.erase(k); v += 1; dm[k] = 0.0; lgv += 1
	var s := ""
	for k in skeys(cr): s += "c%d" % k
	for T in S.teams: s += "o" if T.out else ""
	s += "|" + dsig + "|%d|" % bv
	for q in ck: s += "%d," % q.id
	for T in S.teams: s += "h" if S.hq_of(T.id) != null else "-"
	if s != sig or reach == null:
		sig = s; compute()
		for j in range(nS, N.size()):
			var e = S.by_id.get(N[j].e)
			if e == null or e.kind != "depot": continue
			if e.lcut and not e.lcut0: S.log_msg(e.team, "A forward Supply Depot is CUT OFF from your supply network - half range until a road links it again.")
			elif not e.lcut and e.lcut0: S.log_msg(e.team, "Your forward Supply Depot is back on the supply network.")
			e.lcut0 = e.lcut
	if reach != null:
		cv_t += st
		if cv_t >= 1:
			cv_t = 0.0
			var cs := cover_sig()
			if cvs == null or cs != cvs: cvs = cs; cover()
	road_cap(st)

## CAPTURABLE ROADS: ground units of one side standing on a section (edge) nobody of theirs holds capture it in ~10 s
func road_cap(st: float) -> void:
	if E_.is_empty(): return
	rc_a += st
	if rc_a < 1: return
	var dt := rc_a; rc_a = 0.0
	var Nt: int = S.teams.size(); var NE := E_.size()
	var Nn := PackedInt32Array(); Nn.resize(NE * Nt)
	var any := false
	for u in S.ents:
		if u.dead or u.is_b or u.in_tun or u.team < 0 or u.team >= Nt or u.s_dom != "ground" or S.teams[u.team].out: continue
		for i in NE:
			var e: Dictionary = E_[i]; var b: Array = e.bb
			if e.a == e.b or u.x < b[0] - LG_CUTR or u.x > b[2] + LG_CUTR or u.y < b[1] - LG_CUTR or u.y > b[3] + LG_CUTR: continue
			proj(e, u.x, u.y)
			if pd < LG_CUTR: Nn[i * Nt + u.team] += 1; any = true
	var ch := false
	for k in skeys(rc):
		var q: Dictionary = rc[k]
		if q.p > 0 and not (any and q.c >= 0 and Nn[k * Nt + q.c] > 0):
			q.p = maxf(0.0, q.p - 0.05 * dt)
			if q.p <= 0: q.c = -1
	if any:
		for i in NE:
			var a := -1; var na := 0; var foe := false
			for tt in Nt:
				var n: int = Nn[i * Nt + tt]
				if n > na: na = n; a = tt
			if a < 0: continue
			for tt in Nt:
				if Nn[i * Nt + tt] and not S.ally(tt, a): foe = true; break
			if foe: continue   # contested: paused
			var own := rc_owner(i)
			if own >= 0 and S.ally(own, a): continue
			if not rc.has(i): rc[i] = {o = -1, c = -1, p = 0.0}
			var q2: Dictionary = rc[i]
			if q2.c != a and q2.c >= 0 and not S.ally(q2.c, a):
				q2.p = maxf(0.0, q2.p - 0.25 * dt)
				if q2.p <= 0: q2.c = a
				continue
			q2.c = a; q2.p += dt / LG_RCT * (1 + 0.5 * (mini(na, 6) - 1))
			if q2.p >= 1:
				q2.o = a; q2.p = 0.0; q2.c = -1; ch = true; v += 1; lgv += 1
				S.log_msg(a, "Road captured.")
				if own >= 0 and not S.ally(own, a): S.log_msg(own, "Road lost.")
	if ch: cvs = null

static func br_max(_b: Dictionary) -> float:
	return 2400.0

## road warfare: big blasts hurt bridges and crater a road
func blast(x: float, y: float, r: float, dmg: float, wpn: String, team: int) -> void:
	if r < 22 or dmg < 25: return
	var K := 1.0 if (wpn == "bomb" or wpn == "super" or wpn == "missile" or wpn == "shell" or wpn == "boom") else 0.35
	var KB := 1.0 if (wpn == "bomb" or wpn == "super" or wpn == "missile") else (0.45 if (wpn == "shell" or wpn == "boom") else 0.15)
	for i in bridges.size():
		var b: Dictionary = bridges[i]
		if b.dead: continue
		var dx: float = x - b.x; var dy: float = y - b.y
		if absf(dx * b.t[0] + dy * b.t[1]) > 44 + r * 0.3 or absf(dx * b.n[0] + dy * b.n[1]) > b.h + r * 0.3: continue
		if not bd.has(i): bd[i] = {hp = br_max(b), dead = false, ch = null}
		var s: Dictionary = bd[i]
		s.hp -= minf(400.0, dmg) * KB; v += 1
		if s.hp <= 0: bridge_down(i, team)
	for i in E_.size():
		var e: Dictionary = E_[i]; var bb: Array = e.bb; var m := r * 0.7 + 14
		if x < bb[0] - m or x > bb[2] + m or y < bb[1] - m or y > bb[3] + m: continue
		if cr.has(i): continue
		proj(e, x, y)
		if pd > m: continue
		dm[i] = float(dm.get(i, 0.0)) + minf(300.0, dmg) * K
		if dm[i] >= LG_CRATER_HP:
			dm[i] = 0.0; cr[i] = {x = roundf(px), y = roundf(py), t = S.t + LG_CRATER_T}; v += 1; lgv += 1
			if cov != null:
				for k in S.teams.size():
					var C = cov[k]
					if C != null and C.has(i) and C[i].v.size():
						S.log_msg(k, "A road on your supply lines is cratered - the line is cut behind it. A Construction Vehicle repairs it fast.")

## write the bridge states into the path grid (2 = deck, 4 = blown: water for ships, closed to ground units)
func br_apply() -> void:
	if bv_a == bv: return
	bv_a = bv
	var g: PackedByteArray = S.nav.grid
	for i in bridges.size():
		var s = bd.get(i)
		bridges[i].dead = s != null and s.dead
	for b in bridges:
		if b.dead:
			for c in b.cells:
				if g[c] == 2: g[c] = 4
	for b in bridges:
		if not b.dead:
			for c in b.cells:
				if g[c] == 4 or g[c] == 1: g[c] = 2
	S.nav.grid = g
	S.nav.reg_ground = S.nav._regions(0); S.nav.reg_naval = S.nav._regions(1)
	sig = ""; lgv += 1

func bridge_down(i: int, team: int) -> void:
	var b: Dictionary = bridges[i]
	if not bd.has(i): bd[i] = {hp = 0.0, dead = false, ch = null}
	var s: Dictionary = bd[i]
	if s.dead: return
	s.dead = true; s.hp = 0.0; s.ch = null; bv += 1; v += 1; br_apply()
	var cs := {}
	for c in b.cells: cs[c] = true
	for e in S.ents.duplicate():
		if e.dead or e.is_b or e.s_dom != "ground" or e.in_tun: continue
		var c2 := floori(e.y / S.CELL) * S.GW + floori(e.x / S.CELL)
		if cs.has(c2): S.apply_dmg(e, e.hp + 999, "bomb", team, null, 1.0)
		elif e.has_path and absf(e.x - b.x) < 2600 and absf(e.y - b.y) < 2600: e.has_path = false
	for T in S.teams:
		if not T.out: S.log_msg(T.id, "A bridge has been destroyed - that crossing is closed to ground forces.")

## charges on a bridge: enemy infantry or a Construction Vehicle standing on them 5 s clears them; else it blows
func bridges_tick(st: float) -> void:
	for k in skeys(bd):
		var s: Dictionary = bd[k]; var c = s.ch
		if c == null or s.dead: continue
		var df := false
		for e in S.nearby(c.x, c.y, 60, _nb):
			if not e.dead and not e.is_b and e.team >= 0 and not S.ally(e.team, c.team) and e.s_dom == "ground" and (e.kind == "dozer" or e.is_inf) and hyp(e.x - c.x, e.y - c.y) < 60: df = true; break
		if df:
			c.df += st
			if c.df >= 5:
				s.ch = null; v += 1; lgv += 1; S.log_msg(c.team, "The enemy cleared our charges from the bridge."); continue
		else: c.df = 0.0
		if S.t >= c.t: bridge_down(k, c.team)

## a checkpoint stands while at least one of its trenches does
func ck_tick() -> void:
	if ck.is_empty(): return
	var ids := {}
	for d in S.gar.dug: ids[d.id] = true
	var keep: Array = []
	for q in ck:
		var ok := false
		for i in q.dg:
			if ids.has(i): ok = true; break
		if ok: keep.append(q)
		else: S.log_msg(q.team, "One of your road checkpoints was destroyed.")
	if keep.size() != ck.size(): ck = keep; v += 1; lgv += 1

## road mines: checked every step (vehicles are fast)
func mines(dt: float) -> void:
	if mn.is_empty(): return
	for i in range(mn.size() - 1, -1, -1):
		var m: Dictionary = mn[i]; var hit = null; var clr := -1
		for e in S.nearby(m.x, m.y, 70, _nb):
			if e.dead or e.is_b or e.team < 0 or S.ally(e.team, m.team) or e.s_dom != "ground" or e.in_tun: continue
			var d := hyp(e.x - m.x, e.y - m.y)
			if e.kind == "dozer":
				if d < 70:
					m.cl = float(m.get("cl", 0.0)) + dt
					if m.cl > 3: clr = e.team; break
				continue
			if e.is_inf: continue
			if d < e.r + 14: hit = e; break
		if clr >= 0:
			mn.remove_at(i); v += 1; lgv += 1
			S.log_msg(clr, "Engineers cleared an enemy mine from the road."); S.log_msg(m.team, "The enemy cleared one of our road mines."); continue
		if hit != null:
			mn.remove_at(i); v += 1; lgv += 1
			var ht: int = hit.team
			S.explode(m.x, m.y, 34, 230, m.team, "boom", null)
			S.log_msg(ht, "A vehicle hit a mine on the road!"); S.log_msg(m.team, "One of our road mines hit an enemy vehicle.")

func near_br(x: float, y: float, Rr: float) -> int:
	var bi := -1; var bdd := Rr
	for i in bridges.size():
		var b: Dictionary = bridges[i]; var dx: float = x - b.x; var dy: float = y - b.y
		var u := maxf(0.0, absf(dx * b.n[0] + dy * b.n[1]) - b.h); var w := absf(dx * b.t[0] + dy * b.t[1]); var d := hyp(u, w)
		if d < bdd: bdd = d; bi = i
	return bi

## lgNearRoad: nearest road point within Rr -> {i, x, y, a} or null
func near_road(x: float, y: float, Rr: float):
	var best = null; var bdd := Rr
	for i in E_.size():
		var e: Dictionary = E_[i]; var b: Array = e.bb
		if x < b[0] - Rr or x > b[2] + Rr or y < b[1] - Rr or y > b[3] + Rr: continue
		proj(e, x, y)
		if pd < bdd: bdd = pd; best = {i = i, x = px, y = py, a = pa}
	if best != null and not S.nav.pass_xy(0, best.x, best.y): return null
	return best

## the engineer jobs: order {t="lg", k="mine"|"ckpt"|"demo"|"fixb", team, x, y, ids:[dozer ids]}
func cmd(team: int, a: Dictionary) -> bool:
	var k := str(a.get("k", "")); var T: Dictionary = S.teams[team]
	var o = null
	var ax := float(a.get("x", 0)); var ay := float(a.get("y", 0))
	if k == "mine" or k == "ckpt":
		var q = near_road(ax, ay, 110)
		if q == null: S.log_msg(team, "Pick a spot on a road."); return false
		if k == "ckpt":
			for c in ck:
				if hyp(c.x - q.x, c.y - q.y) < 180: S.log_msg(team, "There is already a checkpoint there."); return false
		o = {type = "lgj", k = k, x = roundf(q.x), y = roundf(q.y), ei = q.i, a = snappedf(q.a, 0.001), bi = -1}
	elif k == "demo" or k == "fixb":
		var i := near_br(ax, ay, 260)
		if i < 0: S.log_msg(team, "Pick a bridge."); return false
		var b: Dictionary = bridges[i]; var s = bd.get(i)
		if k == "demo" and (b.dead or (s != null and s.ch != null)): S.log_msg(team, "That bridge is already down." if b.dead else "Charges are already set on that bridge."); return false
		if k == "fixb" and not b.dead: S.log_msg(team, "That bridge is not destroyed."); return false
		o = {type = "lgj", k = k, bi = i}
	if o == null: return false
	var c2: int = LGC[k]
	if T.credits < c2: S.log_msg(team, "Not enough supplies ($%d needed)." % c2); return false
	var dz: Array = []
	for i2 in a.get("ids", []):
		var u = S.by_id.get(int(i2))
		if u != null and not u.dead and u.team == team and u.kind == "dozer": dz.append(u)
	var tx: float = o.x if o.has("x") else bridges[o.bi].x; var ty: float = o.y if o.has("y") else bridges[o.bi].y
	if dz.is_empty():
		var best = null; var bdd := 1e18
		for u in S.ents:
			if u.team == team and u.kind == "dozer" and not u.dead and not (u.order != null and u.order.type != "move"):
				var d := hyp(u.x - tx, u.y - ty)
				if d < bdd: bdd = d; best = u
		if best != null: dz = [best]
	if dz.is_empty(): S.log_msg(team, "No free Construction Vehicle for that job."); return false
	var u2 = dz[0]
	o.p = 0.0; o.age = 0.0; o.paid = false
	u2.order = o; u2.target = null; u2.has_path = false
	return true

## a Construction Vehicle working an engineer job (from Sim.upd_dozer); true = handled this step
func doze(u, dt: float) -> bool:
	var o = u.order
	if o == null or o.type != "lgj": return false
	o.age += dt
	if o.age > 360: u.order = null; return true
	if o.bi >= 0:
		var b: Dictionary = bridges[o.bi]; var s = bd.get(o.bi)
		if (o.k == "demo" and (b.dead or (s != null and s.ch != null))) or (o.k == "fixb" and not b.dead): u.order = null; return true
	if not o.has("x"):
		var p: Dictionary = bridges[o.bi]
		var A: Array = p.a; var B: Array = p.b
		var pick: Array = A if hyp(A[0] - u.x, A[1] - u.y) <= hyp(B[0] - u.x, B[1] - u.y) else B
		var q = S.nav.nearest_pass_xy(0, pick[0], pick[1])
		o.x = roundf(q.x) if q != null else roundf(pick[0]); o.y = roundf(q.y) if q != null else roundf(pick[1]); o.cx = p.x; o.cy = p.y
	var d := hyp(o.x - u.x, o.y - u.y)
	if d > (26.0 if o.k == "mine" else 64.0): S.nav_to(u, o.x, o.y, dt); return true
	if not o.paid:
		var T: Dictionary = S.teams[u.team]; var c: int = LGC[o.k]
		if T.credits < c: S.log_msg(u.team, "Not enough supplies ($%d needed)." % c); u.order = null; return true
		T.credits -= c; o.paid = true
	o.p += dt; u.building = true
	u.ang = atan2(float(o.get("cy", o.y)) - u.y, float(o.get("cx", o.x)) - u.x); u.last_fire = S.t
	if o.p < LGT[o.k]: return true
	u.order = null; job_done(u, o); return true

func job_done(u, o: Dictionary) -> void:
	var team: int = u.team; var k: String = o.k
	if k == "mine":
		var my := 0; var first := -1
		for i in mn.size():
			if mn[i].team == team:
				my += 1
				if first < 0: first = i
		if my >= LG_MINE_MAX: mn.remove_at(first)
		mn.append({id = d_id, team = team, x = o.x, y = o.y}); d_id += 1; v += 1; lgv += 1
		S.log_msg(team, "Mine laid on the road: the first enemy vehicle over it is hit. Enemy engineers can clear it.")
	elif k == "ckpt":
		var my2 := 0; var first2 := -1
		for i in ck.size():
			if ck[i].team == team:
				my2 += 1
				if first2 < 0: first2 = i
		if my2 >= LG_CK_MAX: ck.remove_at(first2)
		var nx := -sin(o.a); var ny := cos(o.a); var dg: Array = []
		for off in [-58, -34, 34, 58]:
			var d = S.gar.dug_add(team, "trench", o.x + nx * off, o.y + ny * off, o.a)
			if d != null: dg.append(d.id)
		ck.append({id = d_id, team = team, x = o.x, y = o.y, ei = o.ei, dg = dg}); d_id += 1; v += 1; lgv += 1; sig = ""
		S.log_msg(team, "Checkpoint up: enemy supply lines can't use this road while it stands.")
	elif k == "demo":
		var b: Dictionary = bridges[o.bi]
		if not bd.has(o.bi): bd[o.bi] = {hp = br_max(b), dead = false, ch = null}
		bd[o.bi].ch = {team = team, t = S.t + LG_CHG, x = o.x, y = o.y, df = 0.0}; v += 1; lgv += 1
		for T in S.teams:
			if not T.out: S.log_msg(T.id, ("Charges set - the bridge blows in %d s." % int(LG_CHG)) if S.ally(T.id, team) else ("Enemy engineers have rigged a bridge to blow in %d s! Put infantry or a Construction Vehicle on the charges to clear them." % int(LG_CHG)))
	elif k == "fixb":
		var b2: Dictionary = bridges[o.bi]
		if not b2.dead: return
		bd[o.bi] = {hp = br_max(b2), dead = false, ch = null}; bv += 1; v += 1; br_apply()
		for e in S.ents:
			if not e.is_b and e.has_path and e.s_dom != "air": e.has_path = false
		for T in S.teams:
			if not T.out: S.log_msg(T.id, "A bridge has been rebuilt - the crossing is open again.")

# ------------------------------------------------------------------------------------------------ AI (lgAI2)
func _idle_doz(id: int) -> Array:
	var o: Array = []
	for u in S.ents:
		if u.team == id and u.kind == "dozer" and not u.dead and u.order == null: o.append(u)
	return o

func _idle_army(id: int) -> Array:
	var o: Array = []
	for u in S.ents:
		if u.team == id and not u.dead and not u.is_b and not u.in_tun and u.s_dom == "ground" and not u.s_no_attack and u.kind != "harv" and u.kind != "dozer" and u.order == null and u.target == null and not (u.rout > S.t): o.append(u)
	return o

## the Battle AI keeps its supply lines open (called from SimAI.think right after T.ai.t += 1)
func ai(T: Dictionary) -> void:
	if reach == null or T.ai.d < 1 or S.t < 200: return
	var id: int = T.id; var t: int = T.ai.t
	# a crater on its own supply lines: send an idle Construction Vehicle to fill it (6x faster than waiting)
	if t % 6 == 1 and cov != null and cov[id] != null:
		var C: Dictionary = cov[id]
		for k in skeys(cr):
			var c: Dictionary = cr[k]
			if not (c.t > S.t) or not C.has(k) or not (C[k].v.size() or C[k].d.size()): continue
			var near := false
			for u in S.ents:
				if u.team == id and u.kind == "dozer" and not u.dead and hyp(u.x - c.x, u.y - c.y) < 200: near = true; break
			if near: continue
			var dz := _idle_doz(id)
			if dz.size(): S.set_move(dz[0], c.x, c.y, "move"); break
	# guard its own supply lines: enemy troops standing on one of its roads -> a few idle soldiers attack-move there;
	# cut the enemy's: now and then a small idle squad goes to stand on an enemy supply road away from the enemy base
	if t % 5 == 2 and cov != null and cov[id] != null:
		var idle := _idle_army(id)
		if idle.size():
			var C2: Dictionary = cov[id]; var cut := cuts(id); var gp = null
			for ei in skeys(cut):
				if not C2.has(ei): continue
				var c2: Dictionary = C2[ei]; var found := false; var fx := 0.0
				for q in cut[ei]:
					for vv in c2.d:
						if absf(vv[0] - q) < 4: found = true; break
					if not found:
						for vv in c2.v:
							if absf(vv[1] - q) < 4: found = true; break
					if found: fx = q; break
				if found: gp = point(E_[ei], fx); break
			if gp != null:
				for u in idle.slice(0, 4): S.set_move(u, gp.x + ((u.id % 5) - 2) * 16, gp.y + ((u.id % 3) - 1) * 16, "amove")
			elif t % 15 == 7 and idle.size() >= 4:
				var hq = S.hq_of(id); var best = null; var bdd := 1e18
				for k in S.teams.size():
					if S.ally(k, id) or cov[k] == null: continue
					var eh = S.hq_of(k)
					for ei in skeys(cov[k]):
						for vv in cov[k][ei].v:
							var p := point(E_[ei], (vv[0] + vv[1]) / 2)
							if eh != null and hyp(p.x - eh.x, p.y - eh.y) < 900: continue
							var d := hyp(p.x - hq.x, p.y - hq.y) if hq != null else 0.0
							if d < bdd: bdd = d; best = p
				if best != null:
					var n := 0
					for u in idle:
						if not u.is_inf: continue
						S.set_move(u, best.x + ((u.id % 5) - 2) * 14, best.y + ((u.id % 3) - 1) * 14, "amove"); n += 1
						if n >= 3: break
	# capture roads: retake a section the enemy holds near its base, else walk a small idle squad onto the nearest section toward the enemy that is not yet its own
	if t % 7 == 3 and E_.size():
		var hq2 = S.hq_of(id)
		if hq2 != null:
			var idle2 := _idle_army(id)
			if idle2.size() >= 3:
				var eh2 = null; var ed := 1e18
				for k in S.teams.size():
					if S.ally(k, id) or S.teams[k].out: continue
					var h = S.hq_of(k)
					if h != null:
						var d2 := hyp(h.x - hq2.x, h.y - hq2.y)
						if d2 < ed: ed = d2; eh2 = h
				var best2 = null; var bs := 1e18
				for i in E_.size():
					var e: Dictionary = E_[i]
					if e.a == e.b or blk(i, id): continue
					var o := rc_owner(i)
					if o >= 0 and S.ally(o, id): continue
					var p2 := point(e, e.len / 2); var dh := hyp(p2.x - hq2.x, p2.y - hq2.y)
					if dh > 2200: continue
					var q2 = rc.get(i); var lost: bool = q2 != null and q2.o >= 0 and not S.ally(q2.o, id)
					var sc := (dh - 5000) if lost else (hyp(p2.x - eh2.x, p2.y - eh2.y) if eh2 != null else dh)
					if sc < bs: bs = sc; best2 = p2
				if best2 != null:
					for u in idle2.slice(0, 4): S.set_move(u, best2.x + ((u.id % 5) - 2) * 14, best2.y + ((u.id % 3) - 1) * 14, "amove")
	# rebuild a blown bridge on its own lines
	if t % 9 == 4 and T.credits > 1300 and cov != null and cov[id] != null:
		for i in bridges.size():
			if not bridges[i].dead or not _br_on_lines(id, i, true) or _job_on_bridge(i): continue
			var dz2 := _idle_doz(id)
			if dz2.size(): cmd(id, {k = "fixb", x = bridges[i].x, y = bridges[i].y, ids = [dz2[0].id]}); break
	# checkpoints and mines on the roads leaving its base and depots toward an enemy
	var n_ck := 0; var n_mn := 0
	for q in ck:
		if q.team == id: n_ck += 1
	for m in mn:
		if m.team == id: n_mn += 1
	if (t % 11 == 5 and T.credits > 1500 and n_ck < 2) or (t % 13 == 7 and T.credits > 1700 and n_mn < 4):
		var is_ck := t % 11 == 5
		var dz3 := _idle_doz(id)
		if dz3.size():
			var best3 = null; var bs3 := 1e18
			for i in E_.size():
				var e: Dictionary = E_[i]
				if e.a == e.b or blk(i, id): continue
				for pr in [[e.a, e.b], [e.b, e.a]]:
					var A: Dictionary = N[pr[0]]; var Bn: Dictionary = N[pr[1]]
					if not ((A.b >= 0 or A.e) and node_own(A, id)) or node_own(Bn, id): continue
					if not is_ck and not node_foe(Bn, id): continue
					var f := 0.3 if is_ck else 0.45
					var sp: float = e.len * f if pr[0] == e.a else e.len * (1 - f)
					var p3 := point(e, sp); var bad := false
					for q in ck:
						if hyp(q.x - p3.x, q.y - p3.y) < 300: bad = true; break
					if not bad:
						for m in mn:
							if hyp(m.x - p3.x, m.y - p3.y) < 200: bad = true; break
					if bad: continue
					var sc3 := hyp(p3.x - dz3[0].x, p3.y - dz3[0].y) + i
					if sc3 < bs3: bs3 = sc3; best3 = p3
			if best3 != null: cmd(id, {k = "ckpt" if is_ck else "mine", x = best3.x, y = best3.y, ids = [dz3[0].id]})
	# Hard: blow a bridge on its own lines when a big enemy force is about to cross and few of its own troops are near
	if T.ai.d >= 2 and t % 10 == 6 and T.credits > 800 and cov != null and cov[id] != null:
		for i in bridges.size():
			var b: Dictionary = bridges[i]; var s = bd.get(i)
			if b.dead or (s != null and s.ch != null) or not _br_on_lines(id, i, false): continue
			var en_ := 0; var fr := 0
			for e in S.nearby(b.x, b.y, 700, _nb):
				if e.dead or e.is_b or e.s_dom != "ground" or e.team < 0: continue
				if S.ally(e.team, id):
					if hyp(e.x - b.x, e.y - b.y) < 400: fr += 1
				else: en_ += 1
			if en_ >= 6 and fr < 3 and not _job_on_bridge(i):
				for u in S.ents:
					if u.team == id and u.kind == "dozer" and not u.dead and hyp(u.x - b.x, u.y - b.y) < 1600:
						cmd(id, {k = "demo", x = b.x, y = b.y, ids = [u.id]}); return

func _br_on_lines(id: int, i: int, with_cut: bool) -> bool:
	var C: Dictionary = cov[id]
	for ei in E_.size():
		if C.has(ei) and (C[ei].v.size() or (with_cut and C[ei].d.size())) and E_[ei].br.has(i): return true
	return false

func _job_on_bridge(i: int) -> bool:
	for u in S.ents:
		if u.order != null and u.order.type == "lgj" and u.order.bi == i: return true
	return false
