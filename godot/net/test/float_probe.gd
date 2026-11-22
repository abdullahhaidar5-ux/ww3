## Which float functions give bit-different results on different builds (Web vs Windows/Linux)?
## Prints one line per function: "PROBE <name> <hash of 200,000 results>". Compare the lines of two builds.
## Run: any build with  -- --float-probe  (handled by res://net/net_boot.gd).
extends RefCounted

const DM = preload("res://net/det_math.gd")

static func _h(a: PackedFloat64Array) -> int:
	var hc := HashingContext.new()
	hc.start(HashingContext.HASH_MD5)
	hc.update(a.to_byte_array())
	var d := hc.finish()
	return d[0] | (d[1] << 8) | (d[2] << 16) | (d[3] << 24)

static func run() -> Array:
	var N := 200000
	var xs := PackedFloat64Array(); xs.resize(N)
	var ys := PackedFloat64Array(); ys.resize(N)
	var s := 12345
	for i in N:
		s = (s * 1103515245 + 12345) & 0x7fffffff
		xs[i] = (float(s) / 2147483648.0 - 0.5) * (2000.0 if i % 3 else 12.6)
		s = (s * 1103515245 + 12345) & 0x7fffffff
		ys[i] = (float(s) / 2147483648.0 - 0.5) * (2000.0 if i % 5 else 2.0)
	var fns := {
		"add_mul_div": func(x, y): return (x * y + x / (absf(y) + 0.37)) - y * 0.1,
		"sqrt": func(x, _y): return sqrt(absf(x)),
		"hypot_sqrt": func(x, y): return sqrt(x * x + y * y),
		"sin": func(x, _y): return sin(x),
		"cos": func(x, _y): return cos(x),
		"DM.dsin": func(x, _y): return DM.dsin(x),
		"DM.dcos": func(x, _y): return DM.dcos(x),
		"DM.datan2": func(x, y): return DM.datan2(y, x),
		"tan": func(x, _y): return tan(x),
		"atan2": func(x, y): return atan2(y, x),
		"atan": func(x, _y): return atan(x),
		"asin": func(x, _y): return asin(fmod(x, 1.0)),
		"acos": func(x, _y): return acos(fmod(x, 1.0)),
		"pow": func(x, y): return pow(absf(x) + 0.01, fmod(y, 3.0)),
		"exp": func(x, _y): return exp(fmod(x, 20.0)),
		"log": func(x, _y): return log(absf(x) + 0.001),
		"fmod": func(x, y): return fmod(x, absf(y) + 0.01),
		"fposmod": func(x, y): return fposmod(x, absf(y) + 0.01),
		"floor_ceil_round": func(x, y): return floorf(x) + ceilf(y) + roundf(x * 0.5),
		"snapped": func(x, _y): return snappedf(x, 0.25),
		"lerp_clamp": func(x, y): return lerpf(x, y, 0.3) + clampf(x, -5.0, y),
		"lerp_angle": func(x, y): return lerp_angle(x, y, 0.3),
		"angle_difference": func(x, y): return angle_difference(x, y),
		"wrapf": func(x, _y): return wrapf(x, -PI, PI),
		"move_toward": func(x, y): return move_toward(x, y, 0.7),
		"float32_roundtrip": func(x, y): return PackedFloat32Array([x * y])[0],
		"str_to_float": func(x, _y): return float(str(x)),
		"vector2_len_angle": func(x, y): return Vector2(x, y).length() + Vector2(x, y).angle(),
	}
	var lines: Array = []
	var out := PackedFloat64Array(); out.resize(N)
	for name in fns:
		var f: Callable = fns[name]
		for i in N: out[i] = f.call(xs[i], ys[i])
		lines.append("PROBE %s %d" % [name, _h(out)])
	# accuracy of the deterministic versions against this build's own library
	var worst := 0.0
	for i in N:
		worst = maxf(worst, absf(DM.dsin(xs[i]) - sin(xs[i])))
		worst = maxf(worst, absf(DM.dcos(xs[i]) - cos(xs[i])))
		worst = maxf(worst, absf(DM.datan2(ys[i], xs[i]) - atan2(ys[i], xs[i])))
	lines.append("PROBE-ACCURACY worst difference from the engine's sin/cos/atan2: %.18f" % worst)
	return lines
