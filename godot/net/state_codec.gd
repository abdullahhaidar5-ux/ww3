## Whole-state hash and snapshot of a simulation object graph (the Battle sim, res://sim/sim.gd) for online play.
## Generic: walks every script variable of the root object and everything reachable from it (objects, dictionaries,
## arrays, packed arrays), so new sim state is covered without touching this file.
##   hash_of(sim)          -> int   every float bit-exact; two machines agree only if their whole state is identical
##   save(sim)             -> PackedByteArray (compressed)
##   load_into(sim, bytes) -> bool  `sim` must be a sim initialised with the same map / players / seed / rules
##   digest(sim)           -> Array of "name hash" lines (which part of the state differs between two machines)
## Identity is kept for objects, for dictionaries (shared order / field / team rows) and for small arrays inside one
## object (a unit's next waypoint is the same array as the first element of its path).
## Skipped (static after init, scratch or statistics): see SKIP. Names starting with "_" are scratch too.
extends RefCounted

const SKIP := {"R": 1, "prof": 1, "do_prof": 1, "log_lines": 1, "keep_log": 1, "pf_ms": 1, "cover": 1, "hgrid": 1,
	"P_g": 1, "P_came": 1, "P_mark": 1, "P_closed": 1, "P_stamp": 1, "HF": 1, "HI": 1, "last_iters": 1, "hA": 1, "hO": 1}
## dictionary keys that point into the static rules (R): saved as a reference into R, never copied
const MARK := "\u0001#"
const VERSION := 1

static var _props := {}     # Script -> Array[String] of saved variable names

static func props_of(o: Object) -> Array:
	var sc: Script = o.get_script()
	if _props.has(sc): return _props[sc]
	var out: Array = []
	for p in sc.get_script_property_list():
		if not (int(p.usage) & PROPERTY_USAGE_SCRIPT_VARIABLE): continue
		var n := str(p.name)
		if SKIP.has(n) or n.begins_with("_"): continue
		out.append(n)
	_props[sc] = out
	return out

# ------------------------------------------------------------------ hash
static func _flat(root: Object, only: String = "") -> Array:
	var out: Array = []
	var ids := {root.get_instance_id(): 0}
	var queue: Array = [root]
	var qi := 0
	while qi < queue.size():
		var o: Object = queue[qi]
		qi += 1
		for n in props_of(o):
			if qi == 1 and only != "" and n != only: continue
			if n == "s": continue      # a unit's stats row out of the static rules
			_flat_v(o.get(n), out, ids, queue, 0)
		out.append(-7)
	return out

static func _flat_v(v, out: Array, ids: Dictionary, queue: Array, depth: int) -> void:
	match typeof(v):
		TYPE_OBJECT:
			if v == null: out.append(null); return
			var id: int = v.get_instance_id()
			if not ids.has(id):
				ids[id] = queue.size()
				queue.append(v)
			out.append(-9); out.append(ids[id])
		TYPE_DICTIONARY:
			if depth > 24: return
			out.append(-8); out.append(v.size())
			for k in v:
				var x = v[k]
				if (k is String or k is StringName) and (k == "F" or k == "ms" or k == "s") and x is Dictionary: continue
				out.append(k)
				_flat_v(x, out, ids, queue, depth + 1)
		TYPE_ARRAY:
			if depth > 24: return
			out.append(-6); out.append(v.size())
			for x in v: _flat_v(x, out, ids, queue, depth + 1)
		_:
			out.append(v)

static func _h32(bytes: PackedByteArray) -> int:
	var hc := HashingContext.new()
	hc.start(HashingContext.HASH_MD5)
	hc.update(bytes)
	var d := hc.finish()
	return d[0] | (d[1] << 8) | (d[2] << 16) | (d[3] << 24)

static func hash_of(root: Object) -> int:
	return _h32(var_to_bytes(_flat(root)))

## one line per top-level variable of the root: compare two machines' lists to see which part went different
static func digest(root: Object) -> Array:
	var lines: Array = []
	for n in props_of(root):
		lines.append("%s %d" % [n, _h32(var_to_bytes(_flat(root, n)))])
	return lines

# ------------------------------------------------------------------ snapshot
class Enc:
	var objs: Array = []        # objects in first-seen order
	var oid := {}               # instance id -> index
	var marked: Array = []      # dictionaries carrying MARK (cleaned up afterwards)
	var nd := 0
	var na := 0
	var local: Array = []       # arrays seen inside the object being written (identity of small arrays)
	var local_id: Array = []

	func mark_static(v, depth: int = 0) -> void:
		if v is Dictionary:
			if v.is_read_only() or v.has(MARK) or depth > 24: return
			var ks: Array = v.keys()
			v[MARK] = -(marked.size() + 1)
			marked.append(v)
			for k in ks: mark_static(v[k], depth + 1)
		elif v is Array:
			if depth > 24: return
			for x in v: mark_static(x, depth + 1)

	func enc(v, depth: int = 0):
		match typeof(v):
			TYPE_OBJECT:
				if v == null: return null
				var id: int = v.get_instance_id()
				if not oid.has(id):
					oid[id] = objs.size()
					objs.append(v)
				return ["O", oid[id]]
			TYPE_DICTIONARY:
				if depth > 24: return null
				if v.has(MARK):
					var m: int = v[MARK]
					return ["x", -m - 1] if m < 0 else ["r", m]
				var ks: Array = v.keys()
				var my := nd
				nd += 1
				if not v.is_read_only():
					v[MARK] = my
					marked.append(v)
				var kv: Array = []
				for k in ks:
					kv.append(k)
					kv.append(enc(v[k], depth + 1))
				return ["d", my, kv]
			TYPE_ARRAY:
				if depth > 24: return null
				if v.size() <= 4:
					for i in local.size():
						if is_same(local[i], v): return ["A", local_id[i]]
				var my := na
				na += 1
				if v.size() <= 4 and local.size() < 512:
					local.append(v); local_id.append(my)
				var items: Array = []
				for x in v: items.append(enc(x, depth + 1))
				return ["a", my, items]
			_:
				return v

	func cleanup() -> void:
		for d in marked: d.erase(MARK)
		marked = []

static func save(root: Object) -> PackedByteArray:
	var e := Enc.new()
	var statics = root.get("R")
	if statics != null: e.mark_static(statics)
	var n_static := e.marked.size()
	e.oid[root.get_instance_id()] = 0
	e.objs.append(root)
	var recs: Array = []
	var i := 0
	while i < e.objs.size():
		var o: Object = e.objs[i]
		i += 1
		e.local = []; e.local_id = []
		var kv: Array = []
		for n in props_of(o):
			kv.append(n)
			kv.append(e.enc(o.get(n)))
		recs.append([o.get_script().resource_path, kv])
	e.cleanup()
	var raw := var_to_bytes([VERSION, n_static, recs])
	var out := PackedByteArray()
	out.resize(4)
	out.encode_u32(0, raw.size())
	out.append_array(raw.compress(FileAccess.COMPRESSION_ZSTD))
	return out

class Dec:
	var objs: Array = []
	var statics: Array = []
	var dicts := {}
	var arrs := {}

	func dec(v):
		if not (v is Array): return v
		match str(v[0]):
			"O": return objs[int(v[1])]
			"x": return statics[int(v[1])]
			"r": return dicts[int(v[1])]
			"A": return arrs[int(v[1])]
			"d":
				var d := {}
				dicts[int(v[1])] = d
				var kv: Array = v[2]
				for i in range(0, kv.size(), 2): d[kv[i]] = dec(kv[i + 1])
				return d
			"a":
				var a: Array = []
				arrs[int(v[1])] = a
				for x in v[2]: a.append(dec(x))
				return a
		return null

static func load_into(root: Object, data: PackedByteArray) -> bool:
	if data.size() < 8: return false
	var raw := data.slice(4).decompress(data.decode_u32(0), FileAccess.COMPRESSION_ZSTD)
	var top = bytes_to_var(raw)
	if not (top is Array) or top.size() != 3 or int(top[0]) != VERSION: return false
	var recs: Array = top[2]
	var d := Dec.new()
	var statics = root.get("R")
	if statics != null:
		# the static rules are walked exactly as save() did: mark, then read the marks back in order
		var e := Enc.new()
		e.mark_static(statics)
		d.statics = e.marked.duplicate()
		e.cleanup()
	if d.statics.size() != int(top[1]):
		push_error("state_codec: rules differ from the sender's (%d vs %d)" % [d.statics.size(), int(top[1])])
		return false
	# objects the root already owns (pathfinder, AI, RNG...) are refilled in place; everything else is made new
	var own := {}
	for n in props_of(root):
		var v = root.get(n)
		if v is Object and v != null and v.get_script() != null: own[v.get_script().resource_path] = v
	for i in recs.size():
		var path := str(recs[i][0])
		if i == 0: d.objs.append(root)
		elif own.has(path): d.objs.append(own[path]); own.erase(path)
		else: d.objs.append(load(path).new())
	for i in recs.size():
		var o: Object = d.objs[i]
		var kv: Array = recs[i][1]
		for k in range(0, kv.size(), 2): o.set(kv[k], d.dec(kv[k + 1]))
	return true
