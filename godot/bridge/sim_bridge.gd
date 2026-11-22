## The JS-sim bridge (lane P1). The web page loads ww3sim.js (the browser game's simulation) before the engine; this
## class is the only place Godot talks to it. Contract: res://bridge/README.md.
## One JS call + two buffer copies per step; no per-entity JS calls.
extends RefCounted

const E_ID := 0
const E_KIND := 1
const E_TEAM := 2
const E_X := 3
const E_Y := 4
const E_Z := 5
const E_ANG := 6
const E_TANG := 7
const E_HP := 8
const E_FLAGS := 9
const E_AMMO := 10
const E_RANK := 11
const E_STATE := 12
const E_BUILT := 13
const E_VIS := 14
const E_SIZE := 15
const E_TARGET := 16
const E_MAXHP := 17
const ENT_STRIDE := 18
const PROJ_STRIDE := 8
const OIL_ID := 1000000
const F_BUILDING := 1
const F_BUILT := 2
const F_SELECTABLE := 4
const F_DEAD := 8
const F_GARRISON := 16
const F_ROUT := 32
const F_DUG := 64
const F_FIRED := 128
const F_NOPOWER := 256
const F_SELLING := 512
const F_REPAIRING := 1024
const F_SUPPLIED := 2048
const F_ABANDONED := 4096
const F_LANDED := 8192
const F_WORKING := 16384
const F_CAPTURABLE := 32768
const WEB_ONLY := "The battle simulation is the browser game's JavaScript and runs in the WEB build only (export the Web preset and open it in a browser). Desktop / headless Godot has no JavaScript engine."

var js = null                       # JavaScriptObject window.WW3
var n: int = 0
var ent := PackedFloat32Array()
var proj := PackedFloat32Array()
var events: Array = []
var teams: Array = []
var prod: Dictionary = {}
var t: float = 0.0
var over: bool = false
var winner: int = -1
var lgv: int = 0
var step_ms: float = 0.0
var _tables: Dictionary = {}
var _rules: Dictionary = {}

func available() -> bool:
	if js != null: return true
	if not OS.has_feature("web"): return false
	js = JavaScriptBridge.get_interface("WW3")
	return js != null

func _need() -> bool:
	if available(): return true
	push_error(WEB_ONLY)
	return false

func tables() -> Dictionary:
	if _tables.is_empty() and _need(): _tables = JSON.parse_string(js.tables())
	return _tables

## opts = {map, seed, diff, players = [{nation, ai, team}]}
func new_game(opts: Dictionary) -> Dictionary:
	if not _need(): return {ok = 0, error = WEB_ONLY}
	var r = JSON.parse_string(js.newGame(JSON.stringify(opts)))
	if r == null: return {ok = 0, error = "newGame failed"}
	teams = r.teams; t = 0.0; over = false; winner = -1; events = []
	_read()
	return r

func order(team: int, o: Dictionary) -> void:
	if js != null: js.order(team, JSON.stringify(o))

## k fixed ticks of 1/60 s, then the one bulk read
func step(k: int = 2) -> void:
	if js == null: return
	var r = JSON.parse_string(js.step(k))
	if r == null or not r.has("t"): return
	t = float(r.t); over = bool(r.over); winner = int(r.winner); lgv = int(r.lgv); step_ms = float(r.ms)
	events = r.ev; teams = r.teams
	prod = {}
	for p in r.prod: prod[int(p[0])] = {q = p[1], rally = Vector2(p[2], p[3]) if p[2] >= 0 else null}
	_read()

func _read() -> void:
	ent = JavaScriptBridge.js_buffer_to_packed_byte_array(js.entBuf()).to_float32_array()
	proj = JavaScriptBridge.js_buffer_to_packed_byte_array(js.projBuf()).to_float32_array()
	n = ent.size() / ENT_STRIDE

func bytes(name: String) -> PackedByteArray:
	return JavaScriptBridge.js_buffer_to_packed_byte_array(js.mapBuf(name)) if js != null else PackedByteArray()

## once per game: sizes, bases, grids (PackedByteArray), heightfield (PackedFloat32Array), fields, derricks, props
func map_data() -> Dictionary:
	if not _need(): return {}
	var m: Dictionary = JSON.parse_string(js.mapMeta())
	m.grid = bytes("grid"); m.cover = bytes("cover"); m.wood = bytes("wood")
	if m.get("hgrid") != null: m.hgrid.a = bytes("hgrid").to_float32_array()
	if m.get("road") != null: m.road.d = bytes("road")
	return m

func lines() -> Dictionary:
	return JSON.parse_string(js.lines()) if js != null else {}

func fog(team: int) -> PackedByteArray:
	return JavaScriptBridge.js_buffer_to_packed_byte_array(js.fog(team)) if js != null else PackedByteArray()

func inside(id: int) -> Array:
	return JSON.parse_string(js.inside(id)) if js != null else []

func rules(nation: String) -> Dictionary:
	if not _rules.has(nation) and _need(): _rules[nation] = JSON.parse_string(js.rules(nation))
	return _rules.get(nation, {})

func valid_spot(team: int, kind: String, x: float, y: float) -> bool:
	return js != null and int(js.validSpot(team, kind, x, y)) != 0

func req_met(team: int, kind: String) -> bool:
	return js != null and int(js.reqMet(team, kind)) != 0

func state_hash() -> String:
	return str(js.hash()) if js != null else ""
