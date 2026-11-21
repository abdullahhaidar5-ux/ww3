## Seeded random numbers, bit-identical to the browser game's battle RNG (orch/headless.mjs `mul`, mulberry32):
##   a = a + 0x6D2B79F5 | 0; t = imul(a ^ a >>> 15, 1 | a); t = t + imul(t ^ t >>> 7, 61 | t) ^ t; ((t ^ t >>> 14) >>> 0) / 2^32
## All values are kept as unsigned 32-bit ints inside GDScript's 64-bit int.
extends RefCounted

const M32 := 0xFFFFFFFF
var a: int = 0

func _init(seed_value: int = 1) -> void:
	# the game seeds with (seed ^ 0x9E3779B9) >>> 0
	a = (seed_value ^ 0x9E3779B9) & M32

static func imul(x: int, y: int) -> int:
	x &= M32; y &= M32
	return ((x * (y & 0xFFFF)) + (((x * (y >> 16)) & 0xFFFF) << 16)) & M32

func next() -> float:
	a = (a + 0x6D2B79F5) & M32
	var t := imul(a ^ (a >> 15), 1 | a)
	t = ((t + imul(t ^ (t >> 7), 61 | t)) & M32) ^ t
	return float((t ^ (t >> 14)) & M32) / 4294967296.0

## rnd(a,b) of the game: a + random*(b-a)
func rnd(lo: float, hi: float) -> float:
	return lo + next() * (hi - lo)
