## Trigonometry that gives the SAME BITS on every build (Web, Windows, Linux, macOS).
## The engine's sin / cos / atan2 (and tan, atan, asin, acos, pow, exp, log, Vector2.angle/rotated) come from each
## platform's C library and differ in the last bit between the Web export and desktop builds - enough to put an
## online battle out of sync within seconds (measured: orch/reports/gport-p7.md). Plain + - * /, sqrt, fmod, floor,
## round, abs, min/max, lerp ARE identical everywhere, and these functions use nothing else.
## The simulation must call these instead:  const DM = preload("res://net/det_math.gd");  DM.dsin(a), DM.dcos(a),
## DM.datan2(y, x). Drawing code may keep the engine's functions. Accuracy: within 1e-15 of the true value.
extends RefCounted

const PIO2_HI := 1.5707963267341256e+00    # pi/2, upper bits (multiples of it stay exact for small k)
const PIO2_LO := 6.0771005065061922e-11    # pi/2 - PIO2_HI
const TWO_OVER_PI := 0.63661977236758134308

static func _ksin(r: float) -> float:      # |r| <= pi/4
	var z := r * r
	return r + r * z * (-1.0 / 6.0 + z * (1.0 / 120.0 + z * (-1.0 / 5040.0 + z * (1.0 / 362880.0 + z * (-1.0 / 39916800.0 + z * (1.0 / 6227020800.0 + z * (-1.0 / 1307674368000.0 + z * (1.0 / 355687428096000.0))))))))

static func _kcos(r: float) -> float:      # |r| <= pi/4
	var z := r * r
	return 1.0 + z * (-0.5 + z * (1.0 / 24.0 + z * (-1.0 / 720.0 + z * (1.0 / 40320.0 + z * (-1.0 / 3628800.0 + z * (1.0 / 479001600.0 + z * (-1.0 / 87178291200.0 + z * (1.0 / 20922789888000.0))))))))

static func dsin(x: float) -> float:
	var k := roundf(x * TWO_OVER_PI)
	var r := (x - k * PIO2_HI) - k * PIO2_LO
	match int(k) & 3:
		0: return _ksin(r)
		1: return _kcos(r)
		2: return -_ksin(r)
	return -_kcos(r)

static func dcos(x: float) -> float:
	var k := roundf(x * TWO_OVER_PI)
	var r := (x - k * PIO2_HI) - k * PIO2_LO
	match int(k) & 3:
		0: return _kcos(r)
		1: return -_ksin(r)
		2: return -_kcos(r)
	return _ksin(r)

static func _atan01(z: float) -> float:    # 0 <= z <= 1
	# two half-angle steps (sqrt is exact everywhere) bring the argument under tan(pi/16), then a short series
	var u := z / (1.0 + sqrt(1.0 + z * z))
	u = u / (1.0 + sqrt(1.0 + u * u))
	var w := u * u
	return 4.0 * (u + u * w * (-1.0 / 3.0 + w * (1.0 / 5.0 + w * (-1.0 / 7.0 + w * (1.0 / 9.0 + w * (-1.0 / 11.0 + w * (1.0 / 13.0 + w * (-1.0 / 15.0 + w * (1.0 / 17.0 + w * (-1.0 / 19.0 + w * (1.0 / 21.0 + w * (-1.0 / 23.0))))))))))))

static func datan2(y: float, x: float) -> float:
	var ax := absf(x)
	var ay := absf(y)
	if ax == 0.0 and ay == 0.0: return 0.0
	var a: float
	if ay <= ax: a = _atan01(ay / ax)
	else: a = PI * 0.5 - _atan01(ax / ay)
	if x < 0.0: a = PI - a
	return -a if y < 0.0 else a
