## Battle AI (translation of aiThink in src/03-sim.js, Balanced personality, Easy/Normal/Hard difficulty numbers).
## Ported: HQ queue (supply trucks, construction vehicle), ammo trucks, foundations to idle dozers, the build list
## (AIORDER) with Generators kept ahead of power use and lost Barracks/War Factory rebuilt, supply depots next to rich
## fields, Revenue Centers late, combined-arms unit picks (vehicles ~1/3 of army value), random upgrades, home defence,
## idle-far units attack the nearest enemy building, attack waves in formation with Normal flanking, capturable-building
## attack/defence. Not ported yet: generals' powers, leaders, signature units, navy, air strikes, Hard-only probing/pincer/
## odds reading/regroup, ambush/raid personalities, expansion HQs, walls, dams, medics logic.
extends RefCounted
const DM = preload("res://net/det_math.gd")

const E = preload("res://sim/sim_ent.gd")
var S   # the Sim

func _init(sim) -> void:
	S = sim

func d_(T: Dictionary) -> Dictionary:
	return S.R.DIFF[T.ai.d]

func is_veh_s(s: Dictionary) -> bool:
	return s.get("armor") == "heavy" and s.get("dom") == "ground"

func think(T: Dictionary) -> void:
	var id: int = T.id
	var mine: Array = []
	for e: E in S.ents:
		if e.team == id and not e.dead: mine.append(e)
	var hq: E = null; var anchor: E = null
	for e: E in mine:
		if e.kind == "hq": hq = e; break
	if hq != null: anchor = hq
	else:
		for e: E in mine:
			if e.is_b: anchor = e; break
	if anchor == null: return
	T.ai.t += 1
	var at: int = T.ai.t
	var en := foe(T, anchor)
	var D := d_(T)
	# HQ queue: a supply truck if none, then a construction vehicle if none, then trucks up to 3-4
	var harvs := 0; var dz_n := 0
	for e: E in mine:
		if e.kind == "harv": harvs += 1
		elif e.kind == "dozer": dz_n += 1
	if hq != null and S.q_items(T, "hq").is_empty():
		if harvs == 0: S.enqueue(id, "harv")
		elif dz_n == 0: S.enqueue(id, "dozer")
		elif harvs < 3 + (1 if S.t > 300 else 0): S.enqueue(id, "harv")
	# ammo trucks: one per 8 combat units, two at 18+
	if S.done(id, "factory") and at % 6 == 2:
		var has_q := false
		for it in S.q_items(T, "factory"):
			if it.kind == "ammot": has_q = true
		if not has_q:
			var nA := 0
			for e: E in mine:
				if not e.is_b and not e.s_no_attack and e.s_dom == "ground" and not (e.kind in ["harv", "dozer", "hacker"]): nA += 1
			var want := mini(2, (1 + (1 if nA >= 18 else 0)) if nA >= 8 else 0)
			var ams: Dictionary = S.stats(T.fac, "ammot")
			if ams.size() and S.unit_count(id, "ammot") < want and T.credits >= float(ams.cost) + 250: S.enqueue(id, "ammot")
	# foundations without a builder get the nearest free construction vehicle
	var dzs: Array = []
	for e: E in mine:
		if e.kind == "dozer": dzs.append(e)
	for b: E in mine:
		if not (b.is_b and b.nd and b.built < 1.0): continue
		var has := false
		for u: E in dzs:
			if u.order != null and u.order.type == "build" and u.order.target == b: has = true
		if has: continue
		var fr = null; var fd := 1e18
		for u: E in dzs:
			if u.order == null or u.order.type != "build":
				var d: float = S.dist(u, b)
				if d < fd: fd = d; fr = u
		if fr != null: fr.order = {type = "build", target = b}; fr.has_path = false
	# the build list
	var ORD: Array = S.R.AIORDER.filter(func(k): return k != "uplink")
	if T.ai.d >= 2: ORD.append("uplink")
	var blds: Dictionary = T.F.blds
	while T.ai.bi < ORD.size() and (not blds.has(ORD[T.ai.bi]) or ORD[T.ai.bi] == "shipyard"): T.ai.bi += 1
	while T.ai.bi < ORD.size():
		var k: String = ORD[T.ai.bi]; var had := 0; var before := 0
		for e: E in mine:
			if e.is_b and e.kind == k: had += 1
		for i in T.ai.bi:
			if ORD[i] == k: before += 1
		if had <= before: break
		T.ai.bi += 1
	var has_bar := false; var has_fac := false; var unfinished := false
	for e: E in mine:
		if e.kind == "barracks": has_bar = true
		if e.kind == "factory": has_fac = true
		if e.is_b and e.built < 1.0: unfinished = true
	T.ai.re = null
	if T.ai.bi > 1 and not has_bar: T.ai.re = "barracks"
	elif T.ai.bi > 2 and not has_fac: T.ai.re = "factory"
	if blds.has("gen"):
		var pw: Vector2 = S.pwr_of(id)
		var nx := float(S.R.POWER.use.get(ORD[T.ai.bi], 0)) if T.ai.bi < ORD.size() else 0.0
		var gen_building := false
		for e: E in mine:
			if e.kind == "gen" and e.built < 1.0: gen_building = true
		if not gen_building and (pw.y > pw.x or (nx > 0 and pw.y + nx > pw.x)): T.ai.re = "gen"
	if T.ai.re != null and not unfinished:
		var s: Dictionary = S.bstats(T.fac, T.ai.re)
		if T.credits >= float(s.cost):
			var p = find_spot(id, T.ai.re, anchor)
			if p != null: S.place_bld(id, T.ai.re, p.x, p.y); unfinished = true
	# supply depots next to rich fields near home, or right next to a far field the trucks now haul from
	var dps: Array = []; var n_dep := 0; var has_harv := harvs > 0
	for e: E in mine:
		if e.kind == "depot" or e.kind == "hq": dps.append(e)
		if e.kind == "depot": n_dep += 1
	if blds.has("depot") and at % 11 == 5 and dps.size() and not unfinished and has_harv:
		var dc := float(S.bstats(T.fac, "depot").cost)
		var dF = T.ai.dep_f; var haul_f = null
		if dF != null and dF.amt > 800 and n_dep < 5:
			var ok := true
			for b: E in dps:
				if S.dist(b, dF) <= 600: ok = false
			for e: E in S.ents:
				if e.is_b and not e.dead and not S.ally(e.team, id) and S.dist(e, dF) < 800: ok = false
			if ok: haul_f = dF
		if (n_dep < 3 or haul_f != null) and T.credits > dc + (100 if haul_f != null else 400):
			var far = haul_f
			if haul_f != null: T.ai.dep_f = null
			else:
				var bd := 1e18
				for f in S.fields:
					if f.amt <= 2500 or S.dist(f, anchor) >= 1500: continue
					var ok2 := true
					for b: E in dps:
						if S.dist(b, f) <= 520: ok2 = false
					if ok2 and S.dist(f, anchor) < bd: bd = S.dist(f, anchor); far = f
			if far != null:
				var p = find_spot(id, "depot", {x = far.x, y = far.y})
				if p != null and S.hyp(p.x - far.x, p.y - far.y) < 260 and S.place_bld(id, "depot", p.x, p.y): unfinished = true
	# Revenue Center late / when fields run dry
	if blds.has("econ") and at % 13 == 7 and not unfinished and S.req_met(id, "econ"):
		var ec := 0
		for e: E in mine:
			if e.kind == "econ": ec += 1
		var left := 0.0
		for f in S.fields: left += maxf(0.0, f.amt)
		left /= maxf(1.0, S.fields.size() * 9000.0)
		if ec < 4 and (S.t > 480 + ec * 240 or left < 0.35) and T.credits > float(S.bstats(T.fac, "econ").cost) + (200 if left < 0.35 else 900):
			var p = find_spot(id, "econ", anchor)
			if p != null and S.place_bld(id, "econ", p.x, p.y): unfinished = true
	var nk = null if T.ai.re != null else (ORD[T.ai.bi] if T.ai.bi < ORD.size() else null)
	if nk != null and not S.req_met(id, nk):
		T.ai.rq += 1
		if T.ai.rq > 45: T.ai.bi += 1; T.ai.rq = 0
	else: T.ai.rq = 0
	if nk != null and S.req_met(id, nk) and not unfinished:
		var s2: Dictionary = S.bstats(T.fac, nk)
		if T.credits >= float(s2.cost):
			var p = find_spot(id, nk, anchor)
			if p != null: S.place_bld(id, nk, p.x, p.y); T.ai.bi += 1; T.ai.nf = 0
			else:
				T.ai.nf += 1
				if bool(s2.get("shore")) or T.ai.nf > 8: T.ai.bi += 1; T.ai.nf = 0
	# unit purchases
	var army_n := 0
	for e: E in mine:
		if not e.is_b and not e.s_no_attack and e.s_dom != "naval" and not (e.kind in ["harv", "hacker", "dozer"]): army_n += 1
	var thin := army_n < maxi(6, roundi(T.ai.wave * 0.5))
	var reserve := 0.0
	if nk != null and S.req_met(id, nk) and (not thin or nk == "barracks" or nk == "factory"): reserve = float(S.bstats(T.fac, nk).cost) * (1.0 if T.ai.bi < 6 else 0.6)
	var R_: Dictionary = T.F.roster
	var enemy_air := 0
	for e: E in S.ents:
		if e.team == en and not e.is_b and e.s_dom == "air": enemy_air += 1
	var vV := 0.0; var lV := 0.0
	for e: E in mine:
		if not e.is_b and e.s_dom == "ground" and not e.s_no_attack and not (e.kind in ["harv", "dozer", "hacker"]):
			lV += e.s_cost
			if e.is_veh: vV += e.s_cost
	for c in ["barracks", "factory"]:
		for it in S.q_items(T, c):
			var s3: Dictionary = S.stats(T.fac, it.kind)
			if s3.get("dom") != "ground" or s3.get("noAttack"): continue
			lV += float(s3.cost)
			if is_veh_s(s3): vV += float(s3.cost)
	var want_veh: bool = not thin and S.done(id, "factory") and vV < lV * 0.33
	var v_sv := 0.0
	var order: Array = ["shipyard", "factory", "barracks", "airfield"] if want_veh else ["shipyard", "barracks", "factory", "airfield"]
	for cat in order:
		var qb = S.q_pick(id, cat)
		if qb == null or qb.q.size() >= ceili(float(D.q) * S.bs): continue
		if cat == "shipyard": continue   # navy not ported
		var opts: Array = []
		for k in R_.get(cat, []):
			if k in ["champ", "spy", "lander", "airlift", "ammot", "cleric"]: continue
			var sk: Dictionary = S.stats(T.fac, k)
			if sk.is_empty() or sk.get("fake"): continue
			if k == "hacker" and S.unit_count(id, "hacker") >= 3: continue
			if k == "bmt" and T.credits <= 2600: continue
			if sk.get("limit") and S.unit_count(id, k) >= 1: continue
			if k == T.F.special and int(T.rank) < 2: continue
			if sk.get("dom") == "air" or sk.get("dom") == "naval": continue   # aircraft/navy not ported yet
			opts.append(k)
		if cat == "factory":
			if enemy_air >= 2: opts = ["aa", "aa"] + opts
			else: opts = opts.filter(func(k): return k != "aa" or S.rng.next() < 0.2)
		if cat == "airfield": continue
		if cat == "factory": opts = opts.filter(func(k): return k != "drone" or S.rng.next() < 0.35)
		if opts.is_empty(): continue
		var k: String = opts[floori(S.rng.next() * opts.size())]
		var sv := v_sv if cat == "barracks" else 0.0
		if T.credits - reserve - sv >= float(S.stats(T.fac, k).cost): S.enqueue(id, k)
		elif want_veh and cat == "factory" and is_veh_s(S.stats(T.fac, k)) and not S.stats(T.fac, k).get("noAttack"): v_sv = float(S.stats(T.fac, k).cost)
	# upgrades
	if T.credits > 1700 and at % 5 == 0:
		var ups: Array = []
		for k in T.F.upgList:
			if k == "smug" or k == "gpr" or T.upg.has(k) or not T.F.upg.has(k): continue
			var U: Dictionary = T.F.upg[k]
			if S.done(id, U.at) and T.rq.get(U.at) == null: ups.append(k)
		if ups.size(): S.start_research(id, ups[floori(S.rng.next() * ups.size())])
	# the army
	var army: Array = []
	for e: E in mine:
		if not e.is_b and e.s_dom != "naval" and not (e.kind in ["harv", "hacker", "jet", "dozer"]): army.append(e)
	var pb: Array = []
	for e: E in S.ents:
		if e.team == en and e.is_b and not e.dead: pb.append(e)
	var threat = null
	for e: E in S.ents:
		if S.ally(e.team, id) or e.dead or e.is_b or e.team < 0: continue
		for b: E in mine:
			if b.is_b and S.hyp(b.x - e.x, b.y - e.y) < 560: threat = e; break
		if threat != null: break
	if threat != null:
		for u: E in army:
			if u.order == null and S.hyp(u.x - anchor.x, u.y - anchor.y) < 1100 and S.can_target(u.s, threat): S.set_move(u, threat.x, threat.y, "amove")
	# stances: idle troops at home Hold
	if T.ai.d >= 1 and at % 2 == 0:
		for u: E in army:
			var w := 2 if (u.order == null and u.target == null and S.hyp(u.x - anchor.x, u.y - anchor.y) < 500 and not u.s_no_attack and u.s_dom == "ground") else 0
			if w and (u.ai_st < 0 or u.ai_st != w) and (u.ai_st >= 0 or not (u.st >= 2)):
				if u.ai_st < 0: u.ai_prev = u.st
				u.ai_st = w; u.st = w
			elif not w and u.ai_st >= 0: u.st = u.ai_prev; u.ai_st = -1
	var idle: Array = army.filter(func(u): return u.order == null and u.target == null)
	for u: E in idle:
		if u.fl_t != null and not u.fl_t.dead and S.t - u.flank < 150:
			S.set_move(u, u.fl_t.x + S.rnd(-60, 60), u.fl_t.y + S.rnd(-60, 60), "amove"); u.fl_t = null
		elif S.hyp(u.x - anchor.x, u.y - anchor.y) > 900 and pb.size():
			var tb = pb[0]
			for b: E in pb:
				if S.dist(b, u) < S.dist(tb, u): tb = b
			S.set_move(u, tb.x, tb.y, "amove")
	var home: Array = idle.filter(func(u): return S.hyp(u.x - anchor.x, u.y - anchor.y) <= 900 and u.s_dom != "naval")
	var go: bool = home.size() >= T.ai.wave
	if go and pb.size() and S.t > float(D.first):
		var tg = null
		for b: E in pb:
			if b.kind == "hq": tg = b; break
		if tg == null: tg = pb[0]
		var ang := DM.datan2(tg.y - anchor.y, tg.x - anchor.x); var Dd: float = S.hyp(tg.x - anchor.x, tg.y - anchor.y)
		var FL := int(D.flank)
		var fl: Array = []
		if FL and home.size() >= 6 and Dd > (700.0 if FL > 1 else 900.0):
			for i in home.size():
				var u: E = home[i]
				if FL > 2: if i % 2 == 1: fl.append(u)
				elif (i % 3 == 2 and u.is_veh) or i % 4 == 3: fl.append(u)
		var side := 1.0 if S.rng.next() < 0.5 else -1.0
		for i in fl.size():
			var u: E = fl[i]
			var fx: float = anchor.x + DM.dcos(ang) * Dd * 0.62 + DM.dcos(ang + side * 1.57) * minf(650.0, Dd * 0.35)
			var fy: float = anchor.y + DM.dsin(ang) * Dd * 0.62 + DM.dsin(ang + side * 1.57) * minf(650.0, Dd * 0.35)
			S.set_move(u, fx + S.rnd(-50, 50), fy + S.rnd(-50, 50), "amove"); u.flank = S.t; u.fl_t = tg if FL > 1 else null
		var gnd: Array = []
		for u: E in home:
			if not fl.has(u) and u.s_dom == "ground": gnd.append(u)
			elif not fl.has(u): S.set_move(u, tg.x + S.rnd(-60, 60), tg.y + S.rnd(-60, 60), "amove")
		if gnd.size(): form_move(gnd, tg.x, tg.y, "amove")
		T.ai.wave = minf(T.ai.wave + roundf(2 * S.bs), roundf(float(D.maxWave) * S.bs))
	# defend the capturable buildings it holds; go for enemy-held ones near home
	if at % 7 == 3:
		for o in S.oil:
			if o.tb == null or o.owner != id or o.dead: continue
			var hot := false
			for e: E in S.ents:
				if not e.dead and not e.is_b and e.team >= 0 and not S.ally(e.team, id) and e.s_dom == "ground" and S.hyp(e.x - o.x, e.y - o.y) < 220: hot = true; break
			if hot:
				var n := 0
				for u: E in army:
					if n >= 5: break
					if u.order == null and u.target == null and u.s_dom == "ground" and u.s_cls == "inf" and S.hyp(u.x - o.x, u.y - o.y) < 1200: S.set_move(u, o.x, o.y, "amove"); n += 1
			break
	if at % 9 == 0:
		var tgt = null; var bd := 1e18
		for o in S.oil:
			if not o.dead and o.owner >= 0 and not S.ally(o.owner, id) and S.dist(o, anchor) < bd: bd = S.dist(o, anchor); tgt = o
		if tgt != null and bd < 1500:
			var n2 := 0
			for u: E in army:
				if n2 >= 4: break
				if u.order == null and u.target == null and u.s_dom == "ground" and S.can_target(u.s, tgt.tg): u.order = {type = "attack", target = tgt.tg}; u.has_path = false; n2 += 1
	# neutral derricks and capturable buildings: idle infantry walk over to capture them (part of aiExpand in the JS)
	if at % 8 == 4:
		var best = null; var bd2 := 1e18
		for o in S.oil:
			if o.dead or o.owner >= 0: continue
			var d2: float = S.dist(o, anchor)
			if d2 < bd2 and d2 < 1600: bd2 = d2; best = o
		if best != null:
			var sent := false
			for u: E in army:
				if u.order != null and u.order.get("cap") == null and u.order.type == "move" and S.hyp(u.order.x - best.x, u.order.y - best.y) < 40: sent = true
			if not sent:
				for u: E in army:
					if u.order == null and u.target == null and u.is_inf:
						S.set_move(u, best.x + S.rnd(-20, 20), best.y + S.rnd(-20, 20), "move"); break

func foe(T: Dictionary, anchor) -> int:
	var alive: Array = []
	for O in S.teams:
		if S.ally(O.id, T.id): continue
		for e: E in S.ents:
			if e.team == O.id and e.is_b and not e.dead: alive.append(O); break
	if alive.is_empty(): return 1 if T.id == 0 else 0
	if T.ai.foe != null and T.ai.t % 20:
		for O in alive:
			if O.id == T.ai.foe: return T.ai.foe
	var best: int = alive[0].id; var bd := 1e9
	for O in alive:
		var b = null
		for e: E in S.ents:
			if e.team == O.id and e.is_b and not e.dead: b = e; break
		var d: float = S.hyp(b.x - anchor.x, b.y - anchor.y) if b != null else 1e9
		if d < bd: bd = d; best = O.id
	T.ai.foe = best
	return best

static func seg_dist(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
	var dx := bx - ax; var dy := by - ay; var l2 := dx * dx + dy * dy
	var tt := 0.0 if l2 == 0 else clampf(((px - ax) * dx + (py - ay) * dy) / l2, 0.0, 1.0)
	var cx := ax + dx * tt; var cy := ay + dy * tt
	return sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy))

func find_spot(id: int, kind: String, anchor):
	var s: Dictionary = S.bstats(S.teams[id].fac, kind)
	var h := float(s.size) / 2
	var lanes: Array = []; var own: Array = []
	for e: E in S.ents:
		if e.dead or not e.is_b or e.team != id: continue
		own.append(e)
		if e.kind == "hq" or e.kind == "depot":
			for f in S.fields:
				if f.amt > 0 and S.dist(e, f) < 750: lanes.append([e.x, e.y, f.x, f.y])
	for k in 110:
		var a: float = S.rnd(0, 6.28); var r: float = S.rnd(130, 430 if k < 50 else 720)
		var x: float = anchor.x + DM.dcos(a) * r; var y: float = anchor.y + DM.dsin(a) * r
		var roomy := true
		if k < 80:
			for L in lanes:
				if seg_dist(x, y, L[0], L[1], L[2], L[3]) < h + 40: roomy = false; break
			if roomy:
				for e: E in own:
					var g: float = (e.size + float(s.size)) / 2 + 44
					if absf(e.x - x) < g and absf(e.y - y) < g: roomy = false; break
		if roomy and S.valid_spot(id, kind, x, y): return Vector2(x, y)
	return null

## formMove: the group lines up facing its destination (armour in front, infantry behind, support at the back)
func form_move(us: Array, x: float, y: float, type: String) -> void:
	var n := us.size()
	if n == 1: S.set_move(us[0], x, y, type); return
	var cx := 0.0; var cy := 0.0
	for u: E in us: cx += u.x; cy += u.y
	cx /= n; cy /= n
	var dir := DM.datan2(y - cy, x - cx); var fx := DM.dcos(dir); var fy := DM.dsin(dir); var px := -fy; var py := fx
	var FROW: Dictionary = S.R.FROW
	var sorted := us.duplicate()
	sorted.sort_custom(func(p, q):
		var a := int(FROW.get(p.s_cls, 2)); var b := int(FROW.get(q.s_cls, 2))
		return a < b if a != b else p.id < q.id)
	var cols := maxi(2, ceili(sqrt(n * 1.6)))
	var sp := 26.0
	for u: E in us: sp = maxf(sp, u.r * 2 + 8)
	for i in n:
		var u: E = sorted[i]
		var row := i / cols; var in_row := mini(cols, n - row * cols); var col := float(i % cols) - (in_row - 1) / 2.0
		S.set_move(u, x + px * col * sp - fx * row * sp, y + py * col * sp - fy * row * sp, type)
