## Deterministic helpers for the lockstep battle (integers only, so the Windows build and the Web build agree).
## Use: const Det = preload("res://net/det.gd")
##   var rng := Det.Rng.new(seed)  ; rng.next() -> 0..2^32-1 ; rng.below(n) -> 0..n-1
##   Det.fmul(a, b), Det.fdiv(a, b)       16.16 fixed point (ONE = 65536)
##   Det.isqrt(n), Det.sin_a(a), Det.cos_a(a), Det.atan2_a(y, x)   angles: 4096 units = full circle
##   Det.fnv(h, v) / Det.FNV_START       32-bit FNV-1a over 32-bit ints, for the per-turn state hash
## Rules for sim code: no float math, no Time/OS calls, no randf()/randi(), iterate only over arrays/dicts that were
## built in the same order on every machine, no physics engine for gameplay. Floats only for drawing.
## server-godot/test/sim.mjs mirrors Rng/fnv/isqrt in JavaScript; keep the two identical.
extends RefCounted

const ONE := 65536
const M32 := 0xFFFFFFFF
const FNV_START := 2166136261
const FNV_PRIME := 16777619

## xorshift32: tiny, fast and bit-identical in GDScript and JavaScript.
class Rng:
	var s: int
	func _init(seed: int) -> void:
		s = seed & 0xFFFFFFFF
		if s == 0:
			s = 0x9E3779B9
	func next() -> int:
		var x := s
		x ^= (x << 13) & 0xFFFFFFFF
		x ^= x >> 17
		x ^= (x << 5) & 0xFFFFFFFF
		s = x
		return x
	func below(n: int) -> int:
		return next() % n

static func fnv(h: int, v: int) -> int:
	v &= M32
	for i in 4:
		h = ((h ^ ((v >> (i * 8)) & 0xFF)) * FNV_PRIME) & M32
	return h

static func fnv_array(h: int, a: Array) -> int:
	for v in a:
		h = fnv(h, int(v))
	return h

static func fmul(a: int, b: int) -> int:
	return (a * b) >> 16

static func fdiv(a: int, b: int) -> int:
	return (a << 16) / b if b != 0 else 0

## floor(sqrt(n)) for n >= 0, integer Newton.
static func isqrt(n: int) -> int:
	if n <= 0:
		return 0
	var x := n
	var y := (x + 1) >> 1
	while y < x:
		x = y
		y = (x + n / x) >> 1
	return x

const SIN_Q := [0, 402, 804, 1206, 1608, 2010, 2412, 2814, 3216, 3617, 4019, 4420, 4821, 5222, 5623, 6023, 6424, 6824, 7224, 7623, 8022, 8421, 8820, 9218, 9616, 10014, 10411, 10808, 11204, 11600, 11996, 12391, 12785, 13180, 13573, 13966, 14359, 14751, 15143, 15534, 15924, 16314, 16703, 17091, 17479, 17867, 18253, 18639, 19024, 19409, 19792, 20175, 20557, 20939, 21320, 21699, 22078, 22457, 22834, 23210, 23586, 23961, 24335, 24708, 25080, 25451, 25821, 26190, 26558, 26925, 27291, 27656, 28020, 28383, 28745, 29106, 29466, 29824, 30182, 30538, 30893, 31248, 31600, 31952, 32303, 32652, 33000, 33347, 33692, 34037, 34380, 34721, 35062, 35401, 35738, 36075, 36410, 36744, 37076, 37407, 37736, 38064, 38391, 38716, 39040, 39362, 39683, 40002, 40320, 40636, 40951, 41264, 41576, 41886, 42194, 42501, 42806, 43110, 43412, 43713, 44011, 44308, 44604, 44898, 45190, 45480, 45769, 46056, 46341, 46624, 46906, 47186, 47464, 47741, 48015, 48288, 48559, 48828, 49095, 49361, 49624, 49886, 50146, 50404, 50660, 50914, 51166, 51417, 51665, 51911, 52156, 52398, 52639, 52878, 53114, 53349, 53581, 53812, 54040, 54267, 54491, 54714, 54934, 55152, 55368, 55582, 55794, 56004, 56212, 56418, 56621, 56823, 57022, 57219, 57414, 57607, 57798, 57986, 58172, 58356, 58538, 58718, 58896, 59071, 59244, 59415, 59583, 59750, 59914, 60075, 60235, 60392, 60547, 60700, 60851, 60999, 61145, 61288, 61429, 61568, 61705, 61839, 61971, 62101, 62228, 62353, 62476, 62596, 62714, 62830, 62943, 63054, 63162, 63268, 63372, 63473, 63572, 63668, 63763, 63854, 63944, 64031, 64115, 64197, 64277, 64354, 64429, 64501, 64571, 64639, 64704, 64766, 64827, 64884, 64940, 64993, 65043, 65091, 65137, 65180, 65220, 65259, 65294, 65328, 65358, 65387, 65413, 65436, 65457, 65476, 65492, 65505, 65516, 65525, 65531, 65535, 65536]
const ATAN_T := [0, 3, 5, 8, 10, 13, 15, 18, 20, 23, 25, 28, 31, 33, 36, 38, 41, 43, 46, 48, 51, 53, 56, 58, 61, 63, 66, 69, 71, 74, 76, 79, 81, 84, 86, 89, 91, 94, 96, 99, 101, 104, 106, 108, 111, 113, 116, 118, 121, 123, 126, 128, 131, 133, 136, 138, 140, 143, 145, 148, 150, 152, 155, 157, 160, 162, 164, 167, 169, 172, 174, 176, 179, 181, 183, 186, 188, 190, 193, 195, 197, 200, 202, 204, 207, 209, 211, 214, 216, 218, 220, 223, 225, 227, 229, 232, 234, 236, 238, 241, 243, 245, 247, 249, 252, 254, 256, 258, 260, 262, 265, 267, 269, 271, 273, 275, 277, 279, 282, 284, 286, 288, 290, 292, 294, 296, 298, 300, 302, 304, 306, 308, 310, 312, 314, 316, 318, 320, 322, 324, 326, 328, 330, 332, 334, 336, 338, 340, 342, 344, 346, 347, 349, 351, 353, 355, 357, 359, 360, 362, 364, 366, 368, 370, 371, 373, 375, 377, 379, 380, 382, 384, 386, 387, 389, 391, 393, 394, 396, 398, 399, 401, 403, 405, 406, 408, 410, 411, 413, 415, 416, 418, 419, 421, 423, 424, 426, 428, 429, 431, 432, 434, 435, 437, 439, 440, 442, 443, 445, 446, 448, 449, 451, 452, 454, 455, 457, 458, 460, 461, 463, 464, 466, 467, 469, 470, 471, 473, 474, 476, 477, 479, 480, 481, 483, 484, 486, 487, 488, 490, 491, 492, 494, 495, 496, 498, 499, 500, 502, 503, 504, 506, 507, 508, 509, 511, 512]

## sine of angle a (4096 = full circle) in 16.16 fixed point.
static func sin_a(a: int) -> int:
	a &= 4095
	var q := a >> 10
	var r := a & 1023
	if q & 1:
		r = 1024 - r
	var i := r >> 2
	var v: int = SIN_Q[i]
	if i < 256:
		v += ((int(SIN_Q[i + 1]) - v) * (r & 3)) >> 2
	return -v if q >= 2 else v

static func cos_a(a: int) -> int:
	return sin_a(a + 1024)

## angle of (x, y) in 4096 units, 0 = +x, counter-clockwise (y up).
static func atan2_a(y: int, x: int) -> int:
	if x == 0 and y == 0:
		return 0
	var ax := absi(x)
	var ay := absi(y)
	var t: int
	if ax >= ay:
		t = ATAN_T[(ay << 8) / ax]
	else:
		t = 1024 - int(ATAN_T[(ax << 8) / ay])
	if x < 0:
		t = 2048 - t
	if y < 0:
		t = 4096 - t
	return t & 4095
