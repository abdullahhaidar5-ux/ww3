## Toy deterministic battle for the netcode soak test. MUST stay bit-identical to server-godot/test/sim.mjs:
## JavaScript and Godot clients play one game together and every state hash has to match.
extends RefCounted

const Det = preload("res://net/det.gd")
const FP := 256
const W := 2048 * FP
const SPEED := 3 * FP
const R2 := (40 * FP) * (40 * FP)
const START_UNITS := 12
const MAX_UNITS := 24

var rng
var t := 0
var sys := 0
var u: Array = []     # unit: [owner, x, y, tx, ty, hp, cd]

func _init(seed: int, slots: Array) -> void:
	rng = Det.Rng.new(seed)
	var ss := slots.duplicate()
	ss.sort()
	for s in ss:
		for i in START_UNITS:
			spawn(int(s))

func spawn(s: int) -> void:
	var x: int = rng.below(W)
	var y: int = rng.below(W)
	u.append([s, x, y, x, y, 100, 0])

func apply(slot: int, o: Dictionary) -> void:
	if o.has("sys"):
		sys += 1
		return
	var k = o.get("k")
	if k == "mv" and o.get("u") is Array and o.get("x") is int and o.get("y") is int:
		var x: int = clampi(o.x, 0, W - 1)
		var y: int = clampi(o.y, 0, W - 1)
		for i in o.u:
			if not (i is int) or i < 0 or i >= u.size():
				continue
			var a: Array = u[i]
			if a[0] == slot and a[5] > 0:
				a[3] = x
				a[4] = y
	elif k == "sp":
		var n := 0
		for a in u:
			if a[0] == slot and a[5] > 0:
				n += 1
		if n < MAX_UNITS:
			spawn(slot)

func step(orders: Array) -> void:
	for e in orders:
		apply(e.s, e.o)
	t += 1
	for a in u:
		if a[5] <= 0:
			continue
		var dx: int = a[3] - a[1]
		var dy: int = a[4] - a[2]
		var d2 := dx * dx + dy * dy
		if d2 == 0:
			continue
		var d: int = Det.isqrt(d2)
		if d <= SPEED:
			a[1] = a[3]
			a[2] = a[4]
		else:
			a[1] += dx * SPEED / d
			a[2] += dy * SPEED / d
	if t % 3 == 0:
		var n := u.size()
		for i in n:
			var a: Array = u[i]
			if a[5] <= 0:
				continue
			if a[6] > 0:
				a[6] -= 1
				continue
			for j in n:
				var b: Array = u[j]
				if j == i or b[0] == a[0] or b[5] <= 0:
					continue
				var dx: int = b[1] - a[1]
				var dy: int = b[2] - a[2]
				if dx * dx + dy * dy < R2:
					b[5] -= 5 + rng.below(6)
					a[6] = 3
					break
	if t % 300 == 0:
		for a in u:
			if a[5] <= 0:
				a[1] = rng.below(W)
				a[3] = a[1]
				a[2] = rng.below(W)
				a[4] = a[2]
				a[5] = 100
				a[6] = 0

func hash_state() -> int:
	var h: int = Det.FNV_START
	h = Det.fnv(h, t)
	h = Det.fnv(h, rng.s)
	h = Det.fnv(h, sys)
	h = Det.fnv(h, u.size())
	for a in u:
		for v in a:
			h = Det.fnv(h, v)
	return h

func snapshot() -> PackedByteArray:
	var flat: Array = []
	for a in u:
		flat.append_array(a)
	return JSON.stringify({"t": t, "r": rng.s, "y": sys, "u": flat}).to_utf8_buffer()

func restore(data: PackedByteArray) -> void:
	var d: Dictionary = JSON.parse_string(data.get_string_from_utf8())
	t = int(d.t)
	rng.s = int(d.r) & 0xFFFFFFFF
	sys = int(d.y)
	u = []
	var f: Array = d.u
	for i in range(0, f.size(), 7):
		var a: Array = []
		for j in 7:
			a.append(int(f[i + j]))
		u.append(a)

func owned(slot: int) -> Array:
	var r: Array = []
	for i in u.size():
		if u[i][0] == slot and u[i][5] > 0:
			r.append(i)
	return r
