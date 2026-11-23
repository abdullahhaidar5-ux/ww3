// Atmospheric AAA sky dome calibrated for elevated RTS cameras: seamless warm desert/alpine horizon mist melting
// smoothly into vivid cerulean zenith + volumetric sunlit cumulus clouds (zero hard horizon line).
shader_type sky;
uniform vec3 hor = vec3(0.84, 0.84, 0.80);
uniform vec3 zen = vec3(0.12, 0.36, 0.78);
uniform vec3 sun_dir = vec3(-0.72, 0.55, -0.42);
uniform float gain = 1.42;

float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
	float v = 0.0;
	v += n(p) * 0.50;
	v += n(p * 2.07 + vec2(1.7, 3.1)) * 0.28;
	v += n(p * 4.31 + vec2(5.2, 1.3)) * 0.14;
	v += n(p * 8.63 + vec2(2.4, 7.9)) * 0.08;
	return v;
}

void sky() {
	vec3 vd = normalize(EYEDIR);
	// Smooth continuous vertical coordinate from -0.22 (distant mist) up to +0.55 (zenith) with zero sharp seam
	float y = clamp((vd.y + 0.18) / 0.85, 0.0, 1.0);
	float y_smooth = y * y * (3.0 - 2.0 * y);
	vec3 mid_sky = mix(hor, zen, 0.58) + vec3(0.0, 0.04, 0.09) * smoothstep(0.08, 0.4, zen.b);
	vec3 c = mix(hor * 0.94, mid_sky, smoothstep(0.0, 0.34, y));
	c = mix(c, zen, pow(y_smooth, 0.65));

	// Directional sun scattering halo + crisp solar disc
	vec3 sdir = normalize(sun_dir);
	float sun_dot = max(dot(vd, sdir), 0.0);
	float day_k = smoothstep(0.05, 0.30, zen.b + 0.10);
	c += vec3(1.0, 0.86, 0.64) * pow(sun_dot, 6.0) * 0.20 * day_k;
	c += vec3(1.0, 0.96, 0.86) * pow(sun_dot, 128.0) * 0.85 * day_k;

	// Feathered sunlit cumulus cloud banks melting smoothly into horizon mist
	vec2 uv1 = vd.xz / (max(vd.y + 0.20, 0.06) + 0.18) * 1.45 + vec2(TIME * 0.0035, TIME * 0.0012);
	float cl1 = fbm(uv1);
	float cl_lit = fbm(uv1 + sdir.xz * 0.08);
	float mask = smoothstep(0.46, 0.74, cl1) * smoothstep(0.06, 0.32, y);
	vec3 cl_bright = mix(vec3(1.0, 0.98, 0.95), hor, 0.16) * (0.42 + 0.58 * day_k);
	vec3 cl_shadow = mix(hor * 0.76, zen * 0.68, 0.38) * (0.45 + 0.55 * day_k);
	vec3 cl_col = mix(cl_shadow, cl_bright, clamp(0.55 + (cl1 - cl_lit) * 2.2 + pow(sun_dot, 3.0) * 0.35, 0.0, 1.0));
	c = mix(c, cl_col, mask * 0.82);

	COLOR = pow(max(c, vec3(0.0)), vec3(2.2)) * gain;
}
