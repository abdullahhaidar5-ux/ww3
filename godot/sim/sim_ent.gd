## One unit or building of the battle (the JS game's entity objects in G.ents).
## Field names follow the JS ones (src/03-sim.js addUnit/addBld) so the translation stays readable; the most-read stats
## are copied into typed fields at creation (s_*), because Dictionary lookups are the slowest thing in a GDScript hot loop.
## Renderers read: id, is_b, team, kind, x, y, ang, tang, hp, max, built, dead, size, r, state, rank, am/amx, fear, rout.
extends RefCounted

var id: int = 0
var is_b: bool = false
var team: int = 0
var kind: String = ""
var s: Dictionary = {}
var x: float = 0.0
var y: float = 0.0
var ang: float = 0.0
var va: float = 0.0
var tang: float = 0.0
var hd: float = 0.0
var has_hd: bool = false
var v: float = 0.0
var vt: float = -9.0
var hp: float = 0.0
var max: float = 0.0
var r: float = 0.0
var size: float = 0.0
var cd: float = 0.0
var dead: bool = false
var order = null          # Dictionary {type, x, y, target, auto, cap, hold} or null
var target = null         # SimEnt or null
var guard = null          # Dictionary {x, y} or null
var last_hit: float = -99.0
var last_fire: float = -99.0
var state: String = "go"
var cargo: int = 0
var xp: float = 0.0
var rank: int = 0
# buildings
var built: float = 0.0
var q: Array = []         # production queue: [{kind, t, c}]
var rally = null
var dis: float = 0.0
var nd: bool = false
var stall: bool = false
var sell: float = 0.0
var rep: int = 0
var oil: int = -1         # derrick proxy: index into Sim.oil (kind 'derrick'/'techb', team -1)
# movement / paths
var path: Array = []      # [[x,y], ...]
var has_path: bool = false
var pgx: float = 0.0
var pgy: float = 0.0
var prt: float = -1.0
var np_w = null
var np_d: float = 0.0
var np_t: float = 0.0
var mv: float = -9.0
var so = null
var sb_d: float = 0.0
var sb_t: float = 0.0
var srp: int = 0
var av_o: float = 0.0
var av_t: float = -9.0
var px: float = 0.0
var py: float = 0.0
# supply truck
var field = null          # Dictionary (a G.fields row)
var drop = null
var drop_t: float = 0.0
var fld_t: float = 0.0
var gt: float = 0.0
# dozer
var building: bool = false
var bq: Array = []
var fx_t: float = 0.0
# morale / tactics
var fear: float = 0.0
var rout: float = 0.0
var rt_to = null
var last: float = 0.0
var odds: float = 0.0
var sur: bool = false
var rz: String = ""
var m_t: float = 0.0
var supp: float = 0.0
var hm: bool = false
var nsup: int = 0
var aband: int = 0
var crew: int = 0
var cr_t: float = 0.0
var sc_t: float = 0.0
var bt: float = 0.0
var rt: float = 0.0
var retreat: int = 0
var cv_t: float = -9.0
var st: int = 0           # stance: 0 normal, 1 aggressive, 2 hold, 3 guerrilla
var ai_st: int = -1
var ai_prev: int = 0
var flank: float = -999.0
var fl_t = null
# ammo + supply
var am: float = -1.0      # -1 = not initialised (JS: undefined)
var amx: float = 0.0
var sup: int = 0
# vision
var vs: PackedByteArray = PackedByteArray()
var vr: float = 0.0
var ms: float = 0.0       # mass cache
# cached stats (typed copies of s[...])
var s_cls: String = ""
var s_dom: String = "ground"
var s_armor: String = "light"
var s_wpn: String = ""
var s_rng: float = 0.0
var s_dmg: float = 0.0
var s_rof: float = 0.0
var s_spd: float = 0.0
var s_aa: int = 0
var s_cost: float = 0.0
var s_aggro: float = 0.0
var s_splash: float = 0.0
var s_minr: float = 0.0
var s_no_attack: bool = false
var s_ground: bool = true
var s_alt: String = ""
var is_inf: bool = false
var is_veh: bool = false

func cache_stats() -> void:
	s_cls = str(s.get("cls", ""))
	s_dom = str(s.get("dom", "ground"))
	s_armor = str(s.get("armor", "bld" if is_b else "light"))
	s_wpn = str(s.get("wpn", "")) if s.get("wpn") != null else ""
	s_rng = float(s.get("rng", 0.0))
	s_dmg = float(s.get("dmg", 0.0))
	s_rof = float(s.get("rof", 0.0))
	s_spd = float(s.get("spd", 0.0))
	s_aa = int(s.get("aa", 0))
	s_cost = float(s.get("cost", 0.0))
	s_aggro = float(s.get("aggro", s_rng))
	s_splash = float(s.get("splash", 0.0))
	s_minr = float(s.get("minr", 0.0))
	s_no_attack = bool(s.get("noAttack", false))
	s_ground = s.get("ground", true) != false
	s_alt = str(s.get("alt", ""))
	is_inf = s_armor == "light" and s_dom == "ground" and not is_b
	is_veh = s_armor == "heavy" and s_dom == "ground" and not is_b
