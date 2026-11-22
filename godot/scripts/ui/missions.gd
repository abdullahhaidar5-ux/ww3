## Story MISSIONS + TUTORIAL (lane P6): src/12-campaign.js and the Battle tutorial of src/08b-social.js in GDScript.
## A mission is a Battle with a script: setup() places the forces, tick() runs with the sim (same tick on every load,
## so saves and replays stay exact), objectives update on screen. Helpers = the JS `CH` table.
## Also holds small menu data: the key table, the credits, nation flag tiles, map thumbnails.
extends RefCounted

const UI = preload("res://scripts/ui/ui_kit.gd")
const E = preload("res://sim/sim_ent.gd")
const Rng = preload("res://sim/sim_rng.gd")
const MUL := [0.7, 1.0, 1.4]

const LIST := [
	{id = "pass", n = 1, title = "Hold the Pass", sub = "Lebanese Shia · Ridge defense in the southern hills", fac = "RS", enemy = "FR", enemyName = "Invasion Force", map = "beqaa", min = "12-16 min",
		brief = ["An invasion force is pushing up the only road into our valleys, below the limestone ridge. Our main columns are still six minutes away on the mountain tracks.", "You hold the ridge above the road with a small garrison: riflemen, anti-tank teams, two tanks and three dug-in guns. A depot behind the ridge keeps the guns supplied - keep it ours.", "Hold the ridge until the reinforcements arrive. Then do not let the enemy rest: take the fight back down the pass and destroy their forward base."],
		obj = [["hold", "Hold the ridge until reinforcements arrive"], ["reinf", "Reinforcements arrive"], ["crush", "Destroy the enemy forward base"]],
		win = "The pass is ours. The valley is safe, and the road is closed to the invaders.", lose = "The ridge has fallen. The valley will have to be defended from the next line."},
	{id = "supply", n = 2, title = "Supply Run", sub = "Zaidi Shia Movement · Convoy escort across the highlands", fac = "DW", enemy = "US", enemyName = "Siege Force", map = "tihama", min = "12-18 min",
		brief = ["A highland town is surrounded. Its people have food for days, not weeks, and the road in is held by irregulars and raiders of the besieging force.", "Six supply trucks are loaded at your depot. Escort them up through the wadis to the town. Expect ambushes from the ridges and the dry riverbeds - they will hit the trucks first.", "At least four trucks must reach the town. An old cistern depot sits at the halfway ridge: take it for water and money. Scout ahead, keep the escort close, and do not drive blind into the narrows."],
		obj = [["half", "Cross the highlands to the halfway ridge"], ["depot", "Take the cistern depot at the ridge (optional)"], ["clear", "Break the siege line around the town"], ["deliver", "Deliver at least 4 of 6 trucks to the town"]],
		win = "The convoy has reached the town. The siege is broken and the people eat tonight.", lose = "The convoy is lost. The town is on its own."},
	{id = "fortress", n = 3, title = "Mountain Fortress", sub = "Iran · Build and defend in the Zagros", fac = "IR", enemy = "US", enemyName = "Coalition Task Force", map = "zagros", min = "14-18 min",
		brief = ["Our command post sits in a mountain valley that the enemy must take to open the road to the plains. They will come in waves - infantry first, then armor, then everything they have. The Ayatollah is with the garrison; stay close to him and his sermon will steady your lines.", "Build a Mountain Fortress: its rock-cut bunker is nearly immune to shells, and a garrison inside is safe from artillery. A field depot beside the command post pays you while you hold it.", "Hold headquarters until the relief columns arrive. Late in the battle the enemy will send bunker-buster aircraft against the Fortress - you get a warning; take the garrison out in time."],
		obj = [["fort", "Build the Mountain Fortress"], ["hold", "Hold headquarters until relief arrives"], ["bb", "Survive the bunker-buster strikes"]],
		win = "Relief columns have arrived. The valley held.", lose = "Headquarters has fallen. The valley is lost."},
	{id = "town", n = 4, title = "Retake the Village", sub = "Lebanese Shia + Zaidi Shia Movement · Fortified village", fac = "RS", ally = "DW", enemy = "FR", enemyName = "Occupation Force", map = "golan", min = "14-20 min",
		brief = ["An occupation force has dug into a hill village at the crossroads. Its stone houses are held by infantry and anti-tank teams, with armor in the lanes and their own fuel depot at the far gate.", "Lebanese Shia and Zaidi Shia Movement fight side by side: our riflemen and mortars with their mobile technicals. The ally is controlled by its own commander - give it room and follow its lead on the flanks.", "Clear the approach and the two flank lanes, take the village square, then recapture the fuel depot at the far gate. Put infantry into houses to hold ground you have taken - garrisoned riflemen are hard to dislodge. The enemy will counter-attack with reserves from the north."],
		obj = [["z0", "Clear the southern approach"], ["z1", "Clear the west lane"], ["z2", "Clear the east lane"], ["z3", "Take the village square"], ["z4", "Recapture the fuel depot at the far gate"], ["gar", "Garrison a house to hold ground"], ["hold", "Beat back the counter-attacks and hold the village"]],
		win = "The village is free and the depot is ours again. Both flags fly over the square.", lose = "The assault has failed. Our columns fall back."},
	{id = "finale", n = 5, title = "Combined Arms", sub = "Iran · Final assault on the Caspian coast", fac = "IR", enemy = "RU", enemyName = "Northern Group", map = "caspian", min = "14-20 min",
		brief = ["This is the strike that ends the offensive. The enemy has dug a fortified base on the coast: air-defence sites on the approaches, armor in depth, a War Factory and a command post at the back.", "You command a combined force: loitering drones, missile artillery, tanks, infantry and anti-air. The drones cannot fly while the enemy air-defence sites stand - take those out first with artillery and the ground force, then bring the drones in.", "Break the air defenses, destroy the vehicle factory so the armor cannot be replaced, then destroy the headquarters. You have a field depot and a small base behind you for reinforcements."],
		obj = [["sam", "Destroy the enemy air-defence sites"], ["fac", "Destroy the vehicle factory"], ["hq", "Destroy the enemy headquarters"]],
		win = "The enemy command post is rubble. The offensive is over.", lose = "The assault force is destroyed."},
	{id = "marsh", n = 6, title = "Bridgehead on the Euphrates", sub = "Iraqi Shia Brigades · River crossing in the southern marshes", fac = "RV", enemy = "GB", enemyName = "Southern Task Group", map = "euphrates", min = "16-22 min",
		brief = ["The road to the shrine cities runs over the Euphrates. The far bank is held by a task group dug in among the reeds: emplacements at the bridge end, anti-tank teams in the marsh grass, and an ammunition dump behind them that feeds their guns.", "Our volunteer brigades gather on the west bank with riflemen, anti-tank teams, tanks and mortars. Mortars and guns can cover the bridge from your side - use them before the infantry cross. Armor on a bridge is a target; send riflemen first.", "Seize the far end of the bridge, capture the ammunition dump so our guns have supplies on the east bank, and then hold the bridgehead while the engineers bring the main column over. Expect hard counter-attacks along the causeway."],
		obj = [["cross", "Seize the east end of the bridge"], ["dump", "Capture the ammunition dump on the east bank"], ["hold", "Hold the bridgehead until the column crosses"]],
		win = "The bridgehead held and the column is over the river. The road to the shrine cities is open.", lose = "The bridgehead is lost. The brigades fall back to the west bank."},
]

## Battle tutorial (TUTB): k, text, action
const TUT := [
	["gen", "Welcome to Battle! Air defense, the Strike Center, radio and the Airfield need power. Build a Generator; capturing map power plants adds more.", "Click your Dozer (Construction Vehicle), click Generator in the command bar, then click the ground near your base."],
	["dep", "Your Supply Trucks haul money to the Command Center. A Supply Depot next to a far supply field shortens the trip.", "Click your Dozer, click Supply Depot, then click the ground near your base."],
	["bar", "Barracks train infantry, and they unlock the rest of your tech tree.", "Click your Dozer, click Barracks, then click next to your base. Hold Shift to line up several buildings."],
	["fac", "The War Factory builds tanks and other vehicles. It needs a Barracks first.", "With your Dozer selected, place a War Factory next to your base."],
	["sup", "SUPPLY LINES: troops refill ammo near your buildings and along your supply roads (green). Outside them they fight until empty, then must come back or get an Ammo Truck (War Factory). Craters and blown bridges cut a line.", "Press L to show your supply lines (the minimap shows them too)."],
	["veh", "Now put the factory to work. A selected production building shows what it can make and its own queue. Vehicles are built only in the War Factory.", "Click your War Factory, then click a vehicle to train it."],
	["atk", "Your army is ready. Select it (Ctrl+A selects everything), then send it at the enemy with a right-click. Keep an eye on its ammo bar far from your supply lines. Destroy every enemy building to win.", "Select your army and right-click an enemy building."],
]

## the one key table (Settings > Keys, the in-battle help, the selftest)
const KEYS := [
	["Left-click", "Select (drag = box, Shift adds, double-click = that type on screen); place a building; set a rally point"],
	["Right-click", "Move / attack; enter your own building, vehicle, transport or tunnel; launch powers, strikes and road jobs"],
	["Right-drag", "Line formation for the selected infantry"],
	["F + click", "Attack-move"], ["G + click", "Guard a spot or a unit"], ["Ctrl + click", "Force-fire on anything"], ["Alt + click", "Add a waypoint"],
	["X", "Stop"], ["I", "Dig in (infantry dig a dugout and go inside)"], ["E / Shift+E", "Leader abilities"],
	["W A S D / arrows", "Scroll the camera"], ["Mouse wheel", "Zoom"], ["Q", "Rotate the camera: hold Q + mouse; tap = 45° clockwise; Shift+Q = counter-clockwise"],
	["Home / double-tap Q", "Camera north-up"], ["H", "Jump to your Command Center"], ["Space", "Jump to the last event"],
	["Ctrl + A", "Select the whole army"], ["Ctrl + 1-9 / 1-9", "Make / recall a group (double-tap = jump to it)"], ["L", "Show supply lines on the ground"],
	["P", "Generals' powers"], ["Shift + click (unit button)", "Queue 5"], ["Right-click (unit button)", "Cancel one from the queue"],
	["F5 / F9", "Quick save / quick load"], ["Pause / F10", "Pause menu"], ["Esc", "Cancel, close, release the mouse, then the pause menu"],
]

const CREDITS := [
	["World War 3", "Designed and directed by Abdullah. Built with Claude."],
	["Engine", "Godot Engine 4.4 - MIT licence - godotengine.org"],
	["Fonts", "Saira Condensed (Omnibus-Type) and IBM Plex Mono (IBM) - SIL Open Font Licence 1.1"],
	["3D models", "Free models, CC0 and CC-BY: Quaternius, Kenney, PUSHILIN, Poly Haven, spacebits and others - each credited in the model list of the browser edition."],
	["Music", "One shared soundtrack of free recorded tracks, CC0 / CC-BY. \"Curse of the Scarab\" and others by Kevin MacLeod (incompetech.com), CC-BY 4.0."],
	["Sound and voices", "Free battle sounds (CC0 / CC-BY). Unit voices generated in each nation's own language."],
	["Thanks", "To the friends who play every build on Discord."],
]

static func by_id(id: String) -> Dictionary:
	for m in LIST:
		if m.id == id: return m
	return {}

# ---------------------------------------------------------------- flag tiles + map thumbnails (menu)
const FLAG_COL := {"IR": ["239f40", "ffffff", "da0000"], "RS": ["f7d117", "f7d117", "1a8f3a"], "DW": ["ce1126", "ffffff", "000000"], "RV": ["1f6b3a", "ffffff", "111111"], "OB": ["111111", "ffffff", "1a8f3a"],
	"US": ["b22234", "ffffff", "3c3b6e"], "GB": ["012169", "ffffff", "c8102e"], "FR": ["0055a4", "ffffff", "ef4135"], "DE": ["000000", "dd0000", "ffce00"], "IL": ["ffffff", "0038b8", "ffffff"], "UA": ["0057b7", "0057b7", "ffd700"],
	"RU": ["ffffff", "0039a6", "d52b1e"], "CN": ["de2910", "de2910", "ffde00"], "KP": ["024fa2", "ed1c27", "024fa2"], "IN": ["ff9933", "ffffff", "138808"], "JP": ["ffffff", "bc002d", "ffffff"], "KR": ["ffffff", "cd2e3a", "0047a0"],
	"PK": ["01411c", "01411c", "ffffff"], "SA": ["006c35", "006c35", "ffffff"], "AE": ["00732f", "ffffff", "000000"], "TR": ["e30a17", "e30a17", "ffffff"], "EG": ["ce1126", "ffffff", "000000"]}
const FLAG_VERT := ["FR"]

## a small flag-coloured tile with the nation code (plain colour bands; emblems are the visual lane's)
static func flag(k: String, w: float = 38.0, h: float = 34.0) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(w, h)
	c.size = Vector2(w, h)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var cols: Array = FLAG_COL.get(k, ["444444", "666666", "444444"])
	for i in 3:
		var r := ColorRect.new()
		r.color = Color(str(cols[i]))
		r.mouse_filter = Control.MOUSE_FILTER_IGNORE
		if FLAG_VERT.has(k): r.position = Vector2(w / 3.0 * i, 0); r.size = Vector2(w / 3.0 + 0.5, h)
		else: r.position = Vector2(0, h / 3.0 * i); r.size = Vector2(w, h / 3.0 + 0.5)
		c.add_child(r)
	var l := UI.label(k, 13, Color(1, 1, 1), "bold")
	l.add_theme_constant_override("outline_size", 4)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	l.position = Vector2(w * 0.5 - 9, h * 0.5 - 11)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	c.add_child(l)
	return c

static var _thumbs := {}
## top-down picture of a map file: heights, water, roads, woods, start spots (numbered by colour)
static func map_thumb(file: String, w: int = 160) -> Texture2D:
	if _thumbs.has(file): return _thumbs[file]
	var fa := FileAccess.open(file, FileAccess.READ)
	if fa == null: return null
	var m = JSON.parse_string(fa.get_as_text())
	if typeof(m) != TYPE_DICTIONARY: return null
	var mw := float(m.MAPW); var mh := float(m.MAPH)
	var h := int(w * mh / mw)
	var img := Image.create(w, h, false, Image.FORMAT_RGB8)
	var gw := int(m.GW); var gh := int(m.GH)
	var H = m.get("hgrid")
	var hmax := 1.0
	if H != null:
		for v in H.a: hmax = maxf(hmax, float(v))
	for y in h:
		for x in w:
			var gx := clampi(int(float(x) / w * gw), 0, gw - 1); var gy := clampi(int(float(y) / h * gh), 0, gh - 1)
			var gi := gy * gw + gx
			var g := 0.4
			if H != null:
				var hx := clampi(int(float(x) / w * int(H.w)), 0, int(H.w) - 1); var hy := clampi(int(float(y) / h * int(H.h)), 0, int(H.h) - 1)
				g = float(H.a[hy * int(H.w) + hx]) / hmax
			var c := Color(0.50, 0.44, 0.33).lerp(Color(0.80, 0.73, 0.58), g)
			var cell := int(m.grid[gi])
			if cell == 3: c = Color(0.36, 0.34, 0.31)
			elif cell == 1: c = Color(0.12, 0.3, 0.38)
			elif cell == 2: c = Color(0.3, 0.45, 0.48)
			if gi < m.wood.size() and int(m.wood[gi]) > 0: c = c.lerp(Color(0.3, 0.42, 0.22), 0.55)
			img.set_pixel(x, y, c)
	var k := float(w) / mw
	for i in m.bases.size():
		var b: Array = m.bases[i]
		var p := Vector2i(int(float(b[0]) * k), int(float(b[1]) * k))
		for dy in range(-4, 5):
			for dx in range(-4, 5):
				var q := p + Vector2i(dx, dy)
				if q.x >= 0 and q.y >= 0 and q.x < w and q.y < h: img.set_pixelv(q, Color(0.05, 0.05, 0.05) if absi(dx) == 4 or absi(dy) == 4 else UI.SEAT_COL[i % 8])
	var t := ImageTexture.create_from_image(img)
	_thumbs[file] = t
	return t

## the mission's own map when lane P3 has exported it, else the nearest fit of what is there (2-seat first)
static func map_for(m: Dictionary) -> String:
	if not UI.map_info(str(m.map)).is_empty(): return str(m.map)
	var need := 3 if m.has("ally") else 2
	for x in UI.maps():
		if int(x.n) >= need and (need == 2) == (int(x.n) == 2): return x.key
	for x in UI.maps():
		if int(x.n) >= need: return x.key
	return UI.maps()[0].key if UI.maps().size() else ""

static func fac_for(f: String, avoid: String = "") -> String:
	var nats := UI.nations()
	if nats.has(f): return f
	var pref := {"DW": ["RS", "IR"], "RV": ["IR", "RS"], "FR": ["US", "IL"], "GB": ["US", "IL"], "RU": ["US", "IL"]}
	for k in pref.get(f, []):
		if nats.has(k) and k != avoid: return k
	for k in nats:
		if k != avoid: return k
	return nats[0] if nats.size() else f

## the seats a mission starts with (nobody is an AI: the script drives the enemy; the finale switches the enemy AI on)
static func players_for(m: Dictionary) -> Array:
	var me_f := fac_for(str(m.fac))
	var out: Array = [{fac = me_f, ai = false, tm = 1}]
	if m.has("ally"): out.append({fac = fac_for(str(m.ally)), ai = false, tm = 1})
	out.append({fac = fac_for(str(m.enemy), me_f), ai = m.id == "finale", tm = 2})
	return out

# ================================================================= the mission runner (G.camp + CH)
var sim
var m: Dictionary
var diff := 1
var mul := 1.0
var t := 0.0
var o := {}                 # objective key -> done
var over := false
var res := ""
var why := ""
var status = null
var focus = null
var flash := {}             # {m, t, k}
var said: Array = []        # [[t, text, kind]] the radio feed
var rng
var en := 1                 # the enemy's seat
var d := {}                 # per-mission state (c.* in the JS)
var seen := {}

func start(sim_, mission: Dictionary, difficulty: int) -> void:
	sim = sim_; m = mission; diff = difficulty; mul = MUL[clampi(difficulty, 0, 2)]
	rng = Rng.new(31 * 7 + int(m.n))
	for ob in m.obj: o[ob[0]] = false
	en = sim.teams.size() - 1
	var T: Dictionary = sim.teams[en]
	T.F = T.F.duplicate(); T.F.name = m.enemyName
	call("_setup_" + str(m.id))

func tick(dt: float) -> void:
	if over or sim.over: return
	t += dt
	call("_tick_" + str(m.id), dt)
	for ob in m.obj:
		if o[ob[0]] and not seen.has(ob[0]):
			seen[ob[0]] = true
			if flash.is_empty() or flash.t < t - 0.5: do_flash("Objective complete: " + str(ob[1]), "g")
	if over:
		sim.over = true
		sim.winner = 0 if res == "win" else en

func win() -> void:
	if not over: over = true; res = "win"
func lose(w: String = "") -> void:
	if not over: over = true; res = "lose"; why = w

# ---- CH
func R() -> float: return rng.next()
func P() -> Array: return sim.bases[0]
func Eb() -> Array: return sim.bases[en]

func _pass(x: float, y: float) -> Array:
	x = clampf(x, 60, sim.MAPW - 60); y = clampf(y, 60, sim.MAPH - 60)
	for k in 240:
		var r := k * 9.0; var a := k * 2.4
		var px := clampf(x + cos(a) * r, 60, sim.MAPW - 60); var py := clampf(y + sin(a) * r, 60, sim.MAPH - 60)
		if sim.nav.pass_xy(0, px, py): return [px, py]
	return [x, y]

## a point along the line from our base (f=0) to the enemy base (f=1), s = sideways offset
func pt(f: float, s: float = 0.0) -> Array:
	var a := P(); var b := Eb()
	var dx := float(b[0]) - float(a[0]); var dy := float(b[1]) - float(a[1])
	var L := maxf(1.0, sqrt(dx * dx + dy * dy))
	return _pass(float(a[0]) + dx * f - dy / L * s, float(a[1]) + dy * f + dx / L * s)

func has(team: int, kind: String) -> bool:
	return not sim.stats(sim.teams[team].fac, kind).is_empty()

func unit(team: int, kind: String, x: float, y: float):
	if not has(team, kind): kind = "inf"
	var p := _pass(x, y)
	var u = sim.add_unit(team, kind, p[0], p[1])
	if d.has("ehp") and team == en and u != null: u.max = roundf(u.max * float(d.ehp)); u.hp = u.max
	return u

func units(team: int, kind: String, n: float, x: float, y: float, spread: float = 60.0) -> Array:
	var out: Array = []
	for i in maxi(0, roundi(n)): out.append(unit(team, kind, x + (R() - 0.5) * 2.0 * spread, y + (R() - 0.5) * 2.0 * spread))
	return out

func bld(team: int, kind: String, x: float, y: float):
	if sim.bstats(sim.teams[team].fac, kind).is_empty(): return null
	for k in 120:
		var r := k * 7.0; var a := k * 2.4
		var px := x + cos(a) * r; var py := y + sin(a) * r
		if sim.valid_spot(team, kind, px, py) != 0: return sim.add_bld(team, kind, px, py, true)
	return null

func near_hq(team: int, kind: String):
	var hq = sim.hq_of(team)
	if hq == null: return null
	var a0: float = sim.base_facing(team)
	for r in [190.0, 260.0, 330.0]:
		for i in 14:
			var a := a0 + float((i + 1) / 2) * (1 if i % 2 else -1) * 0.45
			var x: float = hq.x + cos(a) * r; var y: float = hq.y + sin(a) * r
			if sim.valid_spot(team, kind, x, y) != 0: return sim.add_bld(team, kind, x, y, true)
	return null

func go(team: int, us: Array, x: float, y: float, amove: bool = true) -> void:
	var ids: Array = []
	for u in us:
		if u != null and not u.dead: ids.append(u.id)
	if ids.size(): sim.apply_order({t = "amove" if amove else "move", team = team, ids = ids, x = x, y = y})

func alive(a: Array) -> Array:
	return a.filter(func(u): return u != null and not u.dead)

func combat(team: int) -> int:
	var n := 0
	for e in sim.ents:
		if e.team == team and not e.dead and not e.is_b and e.kind != "harv" and e.kind != "dozer": n += 1
	return n

func count(team: int, kind: String) -> int:
	var n := 0
	for e in sim.ents:
		if e.team == team and not e.dead and e.kind == kind: n += 1
	return n

func blds(team: int) -> Array:
	return sim.ents.filter(func(e): return e.team == team and e.is_b and not e.dead)

func has_hq(team: int) -> bool:
	return sim.hq_of(team) != null

func near(team: int, x: float, y: float, r: float) -> int:
	var n := 0
	for e in sim.ents:
		if e.team == team and not e.dead and not e.is_b and absf(e.x - x) < r and absf(e.y - y) < r and Vector2(e.x - x, e.y - y).length() < r: n += 1
	return n

func say(msg: String, k: String = "g") -> void:
	said.append([t, msg, k])
	if said.size() > 40: said.pop_front()

func do_flash(msg: String, k: String = "g") -> void:
	flash = {m = msg, t = t, k = k}
	say(msg, k)

func radio(who: String, line: String, en_txt: String, k: String = "g") -> void:
	say("Radio, %s: \"%s\" (%s)" % [who, line, en_txt], k)

func tag(us: Array, nm: String, hp: float = 0.0) -> void:
	for u in us:
		u.s = u.s.duplicate(); u.s.name = nm
		if hp > 0: u.hp = hp; u.max = hp

## a capturable supply depot = one oil derrick row (the sim's one capture system)
func depot(x: float, y: float, owner: int, nm: String) -> Dictionary:
	var p := _pass(x, y)
	var row := {x = p[0], y = p[1], tb = null, pw = 0, owner = owner, cp = [], inc = 0.0, dead = false, burn = 0.0, hit = -99.0, i = sim.oil.size(), dep = nm}
	for k in sim.teams.size(): row.cp.append(0.0)
	row.hp = float(sim.R.OIL_HP); row.max = row.hp
	var tg = E.new()
	tg.is_b = true; tg.kind = "derrick"; tg.team = -1; tg.x = row.x; tg.y = row.y; tg.r = 18; tg.size = 36
	tg.s = {name = nm, armor = "bld"}; tg.oil = row.i; tg.hp = row.hp; tg.max = row.max; tg.cache_stats()
	tg.vs = PackedByteArray(); tg.vs.resize(16); tg.vs.fill(1)
	row.tg = tg
	sim.oil.append(row)
	return row

func clock(s: float) -> String:
	s = maxf(0, ceilf(s))
	return "%d:%02d" % [int(s / 60), int(s) % 60]

func _waves(nm: String) -> void:
	pass

# ---------------------------------------------------------------- 1 Hold the Pass
func _setup_pass() -> void:
	d.T = 360.0
	var Rg := pt(0.2); d.ridge = Rg; focus = Rg
	sim.teams[0].credits = 400.0
	var g: Array = []
	g.append_array(units(0, "inf", roundi(14.0 / maxf(0.8, mul) + 2), Rg[0], Rg[1], 70)); g.append_array(units(0, "at", 4, Rg[0], Rg[1], 50)); g.append_array(units(0, "tank", 2, Rg[0], Rg[1], 50))
	for s in [-120, 0, 120]:
		var p := pt(0.23, s); bld(0, "turret", p[0], p[1])
	var dp := pt(0.12, 150); d.depot = depot(dp[0], dp[1], 0, "Ridge depot")
	var q := pt(0.86)
	for s in [-130, 0, 130]:
		var p := pt(0.8, s); bld(en, "turret", p[0], p[1])
	bld(en, "barracks", q[0], q[1])
	sim.teams[en].credits = 500.0; d.wave = 0; d.next = 25.0
	say("Briefing: hold the ridge for %s. Dug-in guns cover the road; the depot behind you is yours while you stand near it." % clock(d.T))

func _tick_pass(_dt: float) -> void:
	if t < d.T + 60 and t >= d.next:
		d.next += roundi(48.0 / maxf(0.7, mul)); d.wave += 1
		var k: int = d.wave; var s := pt(0.8)
		var us := units(en, "inf", (5 + k * 1.6) * mul, s[0], s[1], 90); us.append_array(units(en, "at", 1 + k * 0.4 * mul, s[0], s[1], 70))
		if k >= 3: us.append_array(units(en, "tank", (k - 1) * 0.7 * mul, s[0], s[1], 70))
		if k >= 5: us.append_array(units(en, "arty", 2 if mul > 1 else 1, s[0], s[1], 70))
		go(en, us, d.ridge[0], d.ridge[1])
		if k == 1: do_flash("Contact! First enemy column on the road below the ridge.", "w")
		elif k == 3: do_flash("Enemy armor is coming up the road. Keep the anti-tank teams behind the guns.", "w")
		elif k == 5: do_flash("Enemy artillery has arrived below the ridge.", "w")
		else: say("Wave %d is on the road." % k, "w")
	if not o.reinf and t >= d.T - 60 and not d.has("warned"):
		d.warned = 1; radio("Column leader", "Thabbetu, ya shabab - dakika w nuss w mnuusal", "Hold on, lads - one more minute and we are there")
	if not o.reinf and t >= d.T:
		o.hold = true; o.reinf = true
		var b := pt(0.02)
		var r := units(0, "inf", 10, b[0], b[1], 90); r.append_array(units(0, "tank", 5, b[0], b[1], 90)); r.append_array(units(0, "at", 3, b[0], b[1], 60)); r.append_array(units(0, "arty", 2, b[0], b[1], 60))
		go(0, r, d.ridge[0], d.ridge[1])
		do_flash("Reinforcements have arrived on the mountain track! Counter-attack - drive them off the pass.")
		sim.teams[0].credits += 1500.0
	if int(d.depot.owner) != 0 and not d.get("depot_lost", false): d.depot_lost = true; do_flash("The ridge depot was taken. Retake it with infantry.", "bad")
	if int(d.depot.owner) == 0: d.depot_lost = false
	if o.reinf and not o.crush and blds(en).is_empty(): o.crush = true
	if o.crush: win()
	elif not o.reinf and t > 5 and combat(0) == 0: lose("Every defender on the ridge has fallen.")
	elif not has_hq(0) and combat(0) == 0: lose("Headquarters and garrison are gone.")
	status = ("Enemy base buildings left: %d" % blds(en).size()) if o.reinf else "Reinforcements in %s · wave %d" % [clock(d.T - t), d.wave]

# ---------------------------------------------------------------- 2 Supply Run
func _setup_supply() -> void:
	sim.teams[0].credits = 600.0
	var s := pt(0.07); focus = s
	units(0, "inf", 8, s[0], s[1], 110); units(0, "tank", 4, s[0], s[1], 110); units(0, "at", 2, s[0], s[1], 70); units(0, "aa", 1, s[0], s[1], 70)
	d.trucks = units(0, "dozer", 6, s[0] - 60, s[1] + 30, 60); tag(d.trucks, "Supply Truck", 420)
	d.delivered = {}
	var town := pt(0.86); d.town = town; d.half = pt(0.5)
	var dp := pt(0.5, 170); d.depot = depot(dp[0], dp[1], -1, "Cistern depot")
	units(0, "inf", 4, town[0], town[1], 60)
	sim.teams[en].credits = 300.0
	d.siege = []
	for s2 in [-200, -80, 80, 200]:
		var p := pt(0.77, s2); d.siege.append_array(units(en, "inf", roundi(4 * mul), p[0], p[1], 60)); d.siege.append_array(units(en, "tank", roundi(1 * mul), p[0], p[1], 60))
	for s2 in [-170, 120]:
		var p := pt(0.8, s2); bld(en, "turret", p[0], p[1])
	d.amb = []
	for it in [[0.26, 300], [0.4, -320], [0.6, 290], [0.68, -260]]:
		var p := pt(it[0], it[1])
		var us := units(en, "inf", roundi(5 * mul), p[0], p[1], 50); us.append_array(units(en, "at", roundi(2 * mul), p[0], p[1], 40))
		if it[0] > 0.5: us.append_array(units(en, "tank", roundi(1 * mul), p[0], p[1], 40))
		d.amb.append({f = it[0], pos = p, fired = false, us = us})
	say("Briefing: six trucks, four must arrive. Ambushes wait on both sides of the road.")

func _tick_supply(_dt: float) -> void:
	var trk := alive(d.trucks)
	for a in d.amb:
		if a.fired: continue
		var hit = null
		for u in trk:
			if Vector2(u.x - a.pos[0], u.y - a.pos[1]).length() < 420: hit = u; break
		if hit != null:
			a.fired = true; go(en, a.us, hit.x, hit.y)
			do_flash("Ambush! Raiders are coming down from the ridge.", "w"); radio("Lead truck", "Kameen! Min el-wadi!", "Ambush! From the wadi!", "w")
			if a.f > 0.5:
				var b := pt(a.f - 0.12); go(en, units(en, "inf", roundi(4 * mul), b[0], b[1], 50), hit.x, hit.y)
	if not o.half and trk.any(func(u): return Vector2(u.x - d.half[0], u.y - d.half[1]).length() < 260): o.half = true; do_flash("Halfway ridge passed. The besieged town is ahead.")
	if not o.depot and int(d.depot.owner) == 0: o.depot = true; do_flash("The cistern depot is ours: water and money for the last stretch.")
	var got := 0
	for u in d.trucks:
		if not u.dead and Vector2(u.x - d.town[0], u.y - d.town[1]).length() < 190 and not d.delivered.has(u.id):
			d.delivered[u.id] = true; say("A truck has reached the town (%d)." % d.delivered.size())
	got = d.delivered.size()
	status = "Trucks delivered %d/6 (need 4) · alive %d" % [got, trk.size()]
	if not o.clear and alive(d.siege).size() <= roundi(2 * mul): o.clear = true; do_flash("The siege line is broken. The town can open its gates.")
	var left := trk.filter(func(u): return not d.delivered.has(u.id)).size()
	if got >= 4: o.deliver = true; win()
	elif got + left < 4: lose("Too many supply trucks were lost.")
	elif combat(0) == 0 and trk.size() > 0 and got < 4: lose("The escort is gone.")

# ---------------------------------------------------------------- 3 Mountain Fortress
func _setup_fortress() -> void:
	var B := P()
	sim.teams[0].credits = roundf(7000.0 / maxf(0.85, mul)); d.T = 720.0; focus = [float(B[0]), float(B[1])]
	unit(0, "dozer", float(B[0]) + 60, float(B[1]) + 110)
	for k in ["barracks", "factory"]: near_hq(0, k)
	units(0, "inf", 8, float(B[0]) + 160, float(B[1]), 90); units(0, "at", 3, float(B[0]) + 160, float(B[1]), 60)
	for s in [-150, 150]:
		var p := pt(0.1, s); bld(0, "turret", p[0], p[1])
	if has(0, "cleric"): d.ayatollah = unit(0, "cleric", float(B[0]) + 90, float(B[1]) + 60)
	var dp := pt(0.06, 260); d.depot = depot(dp[0], dp[1], 0, "Valley depot")
	sim.teams[en].credits = 0.0; d.wave = 0; d.next = 45.0; d.bb = [[500.0, 525.0, false], [640.0, 665.0, false]]; d.bb_done = 0
	d.can_fort = not sim.bstats(sim.teams[0].fac, "fort").is_empty()
	say("Briefing: build the Mountain Fortress, hold %s. E and Shift+E use the Ayatollah." % clock(d.T))

func _tick_fortress(_dt: float) -> void:
	var hq = sim.hq_of(0)
	if t >= d.next and t < d.T - 30:
		d.wave += 1; d.next += roundi(62.0 / maxf(0.75, mul))
		var k: int = d.wave; var s := pt(0.88)
		var us := units(en, "inf", (5 + k * 1.7) * mul, s[0], s[1], 100)
		if k >= 2: us.append_array(units(en, "at", k * 0.5 * mul, s[0], s[1], 70))
		if k >= 3: us.append_array(units(en, "tank", (k - 1) * 0.9 * mul, s[0], s[1], 80))
		if k >= 7: us.append_array(units(en, "arty", 2, s[0], s[1], 70))
		if k >= 8: us.append_array(units(en, "heli", 3 if mul > 1 else 2, s[0], s[1], 70))
		var tx: float = hq.x if hq != null else float(P()[0]); var ty: float = hq.y if hq != null else float(P()[1])
		go(en, us, tx, ty)
		do_flash("Wave %d: enemy column approaching from the plains." % k, "w")
		if k == 1: radio("Scout post", "Dushman az jonub miyad - amade bāshid", "The enemy comes from the south - be ready", "w")
	var fort = null
	for e in sim.ents:
		if e.team == 0 and e.kind == "fort" and not e.dead and e.built >= 1.0: fort = e; break
	if fort != null and not o.fort: o.fort = true; do_flash("The Mountain Fortress stands. Garrison it - a unit inside is safe from artillery.")
	for i in d.bb.size():
		var w: Array = d.bb[i]
		if d.bb_done == i and t >= w[0] and not w[2]: w[2] = true; do_flash("WARNING: bunker-buster aircraft inbound on the Fortress. Evacuate the garrison now!", "bad")
		if d.bb_done == i and t >= w[1]:
			d.bb_done += 1
			var tg = fort if fort != null else hq
			if tg != null:
				sim.explode(tg.x, tg.y, 150.0, 1500.0, en, "bb", null); say("Bunker-buster bombs falling!", "bad")
	if d.bb_done >= d.bb.size() and t > d.bb[1][1] + 8 and not o.bb: o.bb = true; say("The air raids are over.")
	if t >= d.T and hq != null: o.hold = true; win()
	elif hq == null: lose("Headquarters was destroyed.")
	status = "Relief in %s · wave %d" % [clock(d.T - t), d.wave] if t < d.T else null

# ---------------------------------------------------------------- 4 Retake the Village (you + allied commander vs the occupation force)
func _setup_town() -> void:
	var B := P()
	var ap := pt(0.62); var C := [ap[0], ap[1]]
	var ang := atan2(C[1] - float(B[1]), C[0] - float(B[0]))
	var nx := -sin(ang); var ny := cos(ang); var ux := cos(ang); var uy := sin(ang)
	var Rt := 290.0; d.zr = Rt * 0.33
	var zp := func(f: float, s: float) -> Array: return _pass(C[0] - ux * Rt * f + nx * Rt * s, C[1] - uy * Rt * f + ny * Rt * s)
	d.zones = [zp.call(0.72, 0.0), zp.call(0.15, -0.55), zp.call(0.15, 0.55), [C[0], C[1]], zp.call(-0.72, 0.0)]; focus = zp.call(1.3, 0.0)
	sim.teams[0].credits = 1200.0; sim.teams[1].credits = 1000.0; d.ehp = 1.7
	var m0: Array = zp.call(1.35, -0.15); var m1: Array = zp.call(1.35, 0.35)
	units(0, "inf", 14, m0[0], m0[1], 80); units(0, "at", 4, m0[0], m0[1], 60); units(0, "tank", 2, m0[0], m0[1], 60); units(0, "arty", 2, m0[0], m0[1], 50); units(0, "mortar", 2, m0[0], m0[1], 50)
	d.ally = units(1, "inf", 12, m1[0], m1[1], 80); d.ally.append_array(units(1, "tank", 4, m1[0], m1[1], 60)); d.ally.append_array(units(1, "at", 3, m1[0], m1[1], 50))
	d.depot = depot(d.zones[4][0], d.zones[4][1], en, "Fuel depot")
	d.zone_foe = []
	for i in 5:
		var p: Array = d.zones[i]
		var us := units(en, "inf", roundi((12 + i * 2) * mul), p[0], p[1], d.zr * 0.7); us.append_array(units(en, "at", roundi(4 * mul), p[0], p[1], d.zr * 0.6))
		if i >= 2: us.append_array(units(en, "tank", roundi((2.5 if i >= 3 else 1.0) * mul), p[0], p[1], d.zr * 0.5))
		if i == 3 or i == 4:
			for s in [-1, 1]:
				var q: Array = zp.call(0.0 if i == 3 else -0.72, s * 0.35); bld(en, "turret", q[0], q[1])
		d.zone_foe.append(us)
	d.raid = [[110.0, 0.6, false], [220.0, 0.8, false], [330.0, 1.0, false]]; d.rd = []; d.done = [false, false, false, false, false]; d.next_order = 8.0
	o.gar = true     # houses to garrison come with the garrison system (lane P1/P2)
	seen.gar = true
	say("Briefing: five fronts - three approaches, the square, the depot.")

func _tick_town(_dt: float) -> void:
	var dn: Array = d.done
	var gate := [true, dn[0], dn[0], dn[1] and dn[2], dn[3]]
	var msg := ["Southern approach clear. The lanes are open.", "West lane clear.", "East lane clear.", "The village square is taken! Push on to the far gate.", "The fuel depot is ours again!"]
	for i in 5:
		if dn[i] or not gate[i]: continue
		var p: Array = d.zones[i]
		var foes := near(en, p[0], p[1], d.zr * 1.15); var mine := near(0, p[0], p[1], d.zr * 1.4) + near(1, p[0], p[1], d.zr * 1.4)
		if foes <= 2 and mine > 0 and alive(d.zone_foe[i]).size() <= roundi(d.zone_foe[i].size() * 0.15) and (i < 4 or int(d.depot.owner) == 0 or int(d.depot.owner) == 1):
			dn[i] = true; o["z%d" % i] = true; do_flash(msg[i])
			if i == 3: radio("Squad leader", "Wasalna ya shabab, 3al-saaha!", "We have arrived, lads - in the square!")
	for r in d.raid:
		if not r[2] and t >= r[0]:
			r[2] = true
			var s := pt(0.96)
			var us := units(en, "inf", (10 + r[1] * 6) * mul, s[0], s[1], 90); us.append_array(units(en, "tank", (2 + r[1] * 3) * mul, s[0], s[1], 70))
			d.rd.append_array(us)
			var z: Array = d.zones[2 if dn[3] else 3]
			go(en, us, z[0], z[1]); do_flash("Enemy reserves are counter-attacking from the north!", "w")
	if t >= d.next_order:
		d.next_order += 26.0
		var k: int = dn.find(false)
		if k >= 0:
			var z: Array = d.zones[k]; var off: float = (1 if k % 2 else -1) * d.zr * 0.5
			go(1, d.ally, z[0] + off, z[1] - off)
	d.ally = alive(d.ally)
	var left: int = dn.count(false)
	status = "%d objective%s left in the village" % [left, "s" if left > 1 else ""] if left > 0 else null
	var raids_on: bool = d.raid.any(func(r): return not r[2]) or alive(d.rd).size() > roundi(3 * mul)
	if left == 0 and not raids_on: o.hold = true; win()
	elif left == 0 and not o.hold: status = "Hold the village - counter-attack %d/3 · %d enemy left" % [d.raid.filter(func(r): return r[2]).size(), alive(d.rd).size()]
	elif combat(0) == 0 and sim.teams[0].credits < 200: lose("Our assault force is spent.")
	elif not has_hq(0) and combat(0) == 0: lose("Base and assault force lost.")

# ---------------------------------------------------------------- 5 Combined Arms
func _setup_finale() -> void:
	sim.teams[0].credits = 3500.0
	var s := pt(0.14); focus = s
	for k in ["barracks", "factory"]: near_hq(0, k)
	units(0, "drone", 8, s[0], s[1], 90); units(0, "arty", 5, s[0], s[1], 90); units(0, "tank", 8, s[0], s[1], 110); units(0, "inf", 12, s[0], s[1], 110); units(0, "at", 4, s[0], s[1], 70); units(0, "aa", 2, s[0], s[1], 70)
	var dp := pt(0.3, 200); d.depot = depot(dp[0], dp[1], -1, "Forward depot")
	sim.teams[en].credits = 3000.0
	for k in ["barracks", "factory"]: near_hq(en, k)
	for s2 in [-260, -90, 90, 260]:
		var p := pt(0.8, s2); bld(en, "turret", p[0], p[1])
	for s2 in [-200, 0, 200]:
		var p := pt(0.9, s2); bld(en, "sam", p[0], p[1])
	var q := pt(0.85)
	units(en, "tank", roundi(5 * mul), q[0], q[1], 140); units(en, "inf", roundi(10 * mul), q[0], q[1], 140); units(en, "at", roundi(4 * mul), q[0], q[1], 100); units(en, "aa", 2, q[0], q[1], 100)
	say("Briefing: air defenses first, then the factory, then the headquarters.")

func _tick_finale(_dt: float) -> void:
	var sam := count(en, "sam"); var fac := count(en, "factory"); var hq := count(en, "hq")
	if not o.sam and sam == 0: o.sam = true; do_flash("Air defenses down - the drones have a free sky."); radio("Drone team", "Al-sama' maftuha", "The sky is open")
	if not o.fac and fac == 0: o.fac = true; do_flash("The vehicle factory is rubble - no more armor for them.")
	if not o.hq and hq == 0: o.hq = true
	status = null if o.hq else "Enemy: %d air-defence site%s · %d factory · %d HQ" % [sam, "" if sam == 1 else "s", fac, hq]
	if o.hq: win()
	elif combat(0) == 0 and sim.teams[0].credits < 250: lose("The assault force is destroyed.")
	elif not has_hq(0) and combat(0) == 0: lose("Base and force lost.")

# ---------------------------------------------------------------- 6 Bridgehead on the Euphrates
func _setup_marsh() -> void:
	var B := P()
	var mid := pt(0.5)
	var nr := pt(0.42); var fr := pt(0.58)
	var br: Array = sim.get("map_bridges") if sim.get("map_bridges") != null else []
	var bd := 1e9
	for b in br:
		var q := Vector2(float(b.x) - mid[0], float(b.y) - mid[1]).length()
		if q < bd:
			bd = q
			var da := Vector2(float(b.a[0]) - float(B[0]), float(b.a[1]) - float(B[1])).length(); var db := Vector2(float(b.b[0]) - float(B[0]), float(b.b[1]) - float(B[1])).length()
			nr = b.a if da < db else b.b; fr = b.b if da < db else b.a
	d.near = nr; d.far = fr
	var ex: float = float(fr[0]) - float(nr[0]); var ey: float = float(fr[1]) - float(nr[1])
	var L := maxf(1.0, sqrt(ex * ex + ey * ey)); var ux := ex / L; var uy := ey / L; var vx := -uy; var vy := ux
	var at := func(f: float, s: float) -> Array: return _pass(float(fr[0]) + ux * f + vx * s, float(fr[1]) + uy * f + vy * s)
	focus = [float(nr[0]) - ux * 150, float(nr[1]) - uy * 150]
	sim.teams[0].credits = 2200.0; d.HOLD = 60.0 * roundi(6 + (mul - 0.7) * 3)
	near_hq(0, "barracks")
	var mx: float = float(nr[0]) - ux * 260; var my: float = float(nr[1]) - uy * 260
	units(0, "inf", 18, mx, my, 110); units(0, "at", 6, mx, my, 80); units(0, "tank", 4, mx - ux * 80, my - uy * 80, 100); units(0, "mortar", 4, mx - ux * 160, my - uy * 160, 70); units(0, "arty", 2, mx - ux * 200, my - uy * 200, 70)
	var dr: Array = at.call(300.0, 0.0); d.depot = depot(dr[0], dr[1], en, "Ammunition dump")
	sim.teams[en].credits = 1500.0
	for s in [-170, 0, 170]:
		var p: Array = at.call(120.0, float(s)); bld(en, "turret", p[0], p[1])
	var fe := units(en, "inf", roundi(12 * mul), dr[0], dr[1], 150); fe.append_array(units(en, "at", roundi(4 * mul), dr[0], dr[1], 110)); fe.append_array(units(en, "tank", roundi(3 * mul), dr[0], dr[1], 110)); fe.append_array(units(en, "mortar", roundi(2 * mul), dr[0], dr[1], 90))
	d.wave = 0; d.next = 0.0; d.hs = 0.0; d.hold = 0.0
	say("Briefing: mortars first, riflemen across, then the dump. Hold %s once the east end is ours." % clock(d.HOLD))

func _tick_marsh(dt: float) -> void:
	var fx: float = float(d.far[0]); var fy: float = float(d.far[1])
	var far_n := near(0, fx, fy, 300); var foe_far := near(en, fx, fy, 330)
	var tur := 0
	for e in sim.ents:
		if e.team == en and e.kind == "turret" and not e.dead and Vector2(e.x - fx, e.y - fy).length() < 500: tur += 1
	if not o.cross and far_n >= 4 and foe_far <= roundi(2 * mul) and tur == 0:
		o.cross = true; d.hs = t; d.next = t + 35
		do_flash("The east end of the bridge is ours! Hold it - the enemy will counter-attack along the causeway.")
		radio("Brigade commander", "Ya shabab, el-jisir saar ilna", "Lads, the bridge is ours")
		sim.teams[0].credits += 800.0
		go(0, units(0, "inf", 8, float(d.near[0]), float(d.near[1]), 80), fx, fy)
	if not o.dump and int(d.depot.owner) == 0: o.dump = true; do_flash("The ammunition dump is ours: guns on this bank are supplied.")
	if o.cross and t >= d.next:
		d.wave += 1; d.next += roundi(62.0 / maxf(0.75, mul))
		var k: int = d.wave; var s := pt(0.86)
		var us := units(en, "inf", (5 + k * 1.5) * mul, s[0], s[1], 100); us.append_array(units(en, "at", (1 + k * 0.4) * mul, s[0], s[1], 70))
		if k >= 2: us.append_array(units(en, "tank", (k - 0.5) * 0.7 * mul, s[0], s[1], 80))
		if k >= 4: us.append_array(units(en, "arty", 2 if mul > 1 else 1, s[0], s[1], 70))
		go(en, us, fx, fy); do_flash("Counter-attack %d is coming down the east causeway." % k, "w")
		if k == 1: radio("Lookout", "Intabihu - el-aduw jaay min el-qasab", "Watch out - the enemy comes through the reeds", "w")
	var held: bool = o.cross and o.dump
	if held: d.hold = minf(d.HOLD, d.hold + dt)
	if o.cross and not o.dump and t - d.hs > 240 and not d.has("nag"): d.nag = 1; do_flash("The ammunition dump is still in enemy hands. Capture it: infantry stand next to it for a few seconds.", "w")
	if held and d.hold >= d.HOLD and not o.hold: o.hold = true; do_flash("The engineers report: the main column is across.")
	if not o.cross: status = "East end: %d enemy near · %d emplacements" % [foe_far, tur]
	elif held: status = null if o.hold else "Hold the bridgehead · " + clock(d.HOLD - d.hold)
	else: status = "Capture the dump · hold clock waits"
	if o.cross and held and o.hold: win()
	elif o.cross and t - d.hs > 40 and near(0, fx, fy, 420) == 0 and not o.hold: lose("The bridgehead was overrun.")
	elif combat(0) == 0 and sim.teams[0].credits < 250: lose("The brigades are spent.")
	elif not has_hq(0) and combat(0) == 0: lose("Base and brigades lost.")
