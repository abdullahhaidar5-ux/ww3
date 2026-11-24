// Epic Volumetric AAA Sky Dome: seamless warm horizon mist melting into deep cerulean zenith,
// golden Mie solar scattering corona, high wispy cirrus streaks & sunlit cumulus banks with silver-lining rim glow.
shader_type sky;
uniform vec3 hor = vec3(0.86, 0.83, 0.76);
uniform vec3 zen = vec3(0.11, 0.35, 0.80);
uniform vec3 sun_dir = vec3(-0.75, 0.48, -0.44);
uniform float gain = 1.48;
uniform float overcast = 0.0;

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
	float ov = clamp(overcast, 0.0, 1.0);
	float y = clamp((vd.y + 0.18) / 0.85, 0.0, 1.0);
	float y_smooth = y * y * (3.0 - 2.0 * y);

	// Desaturate and cool sky gradient under overcast/rain/storm conditions so sky blends with storm fog
	float hor_luma = dot(hor, vec3(0.299, 0.587, 0.114));
	vec3 storm_hor = mix(hor, vec3(hor_luma) * vec3(0.86, 0.90, 0.95), ov * 0.65);
	vec3 storm_zen = mix(zen, vec3(hor_luma * 0.66) * vec3(0.82, 0.88, 0.96), ov * 0.72);
	vec3 mid_sky = mix(storm_hor, storm_zen, 0.58) + vec3(0.0, 0.04, 0.11) * smoothstep(0.08, 0.4, storm_zen.b) * (1.0 - ov * 0.75);
	vec3 c = mix(storm_hor * 0.96, mid_sky, smoothstep(0.0, 0.34, y));
	c = mix(c, storm_zen, pow(y_smooth, 0.62));

	// Directional Mie sun corona + blazing solar disc + warm horizon scatter (dimmed smoothly by overcast)
	vec3 sdir = normalize(sun_dir);
	float sun_dot = max(dot(vd, sdir), 0.0);
	float day_k = smoothstep(0.05, 0.30, zen.b + 0.10);
	float sun_vis = 1.0 - ov * 0.90;
	float corona_vis = 1.0 - ov * 0.70;
	float hor_glow = exp(-abs(vd.y - 0.03) * 9.5) * pow(sun_dot, 2.2) * 0.24 * day_k * corona_vis;
	c += vec3(1.0, 0.82, 0.54) * (pow(sun_dot, 5.0) * 0.26 * day_k * corona_vis + hor_glow);
	c += vec3(1.0, 0.96, 0.86) * pow(sun_dot, 110.0) * 1.15 * day_k * sun_vis;

	// Layer 1: High-altitude wispy cirrus streaks
	vec2 uv_hi = vd.xz / (max(vd.y + 0.24, 0.08) + 0.22) * vec2(2.4, 0.95) + vec2(TIME * 0.0022, TIME * 0.0007);
	float cirrus = smoothstep(0.54, 0.84, fbm(uv_hi)) * smoothstep(0.14, 0.44, y) * 0.32 * (1.0 - ov * 0.65);
	vec3 cir_col = mix(vec3(1.0, 0.96, 0.90), storm_hor, 0.25) * (0.45 + 0.55 * day_k);
	c = mix(c, cir_col, cirrus);

	// Layer 2: Sunlit cumulus banks that thicken into moody overcast/storm cloud decks
	vec2 uv1 = vd.xz / (max(vd.y + 0.20, 0.06) + 0.18) * 1.42 + vec2(TIME * 0.0038, TIME * 0.0014);
	float cl1 = fbm(uv1);
	float cl_lit = fbm(uv1 + sdir.xz * 0.09);
	float lo_edge = mix(0.45, 0.15, ov);
	float hi_edge = mix(0.73, 0.52, ov);
	float mask = smoothstep(lo_edge, hi_edge, cl1) * smoothstep(0.04, 0.28, y);
	float rim = smoothstep(0.45, 0.56, cl1) * (1.0 - smoothstep(0.56, 0.70, cl1)) * pow(sun_dot, 2.5) * (1.0 - ov * 0.85);
	vec3 cl_bright = mix(vec3(1.0, 0.97, 0.92), storm_hor, mix(0.15, 0.68, ov)) * (0.45 + 0.55 * day_k) * mix(1.0, 0.82, ov);
	vec3 cl_shadow = mix(storm_hor * 0.72, storm_zen * 0.62, 0.42) * (0.44 + 0.56 * day_k) * mix(1.0, 0.68, ov);
	float lit_k = clamp(0.54 + (cl1 - cl_lit) * mix(2.5, 1.35, ov) + pow(sun_dot, 3.0) * 0.42 * corona_vis, 0.0, 1.0);
	vec3 cl_col = mix(cl_shadow, cl_bright, lit_k);
	cl_col += vec3(1.0, 0.88, 0.66) * rim * 0.65 * day_k;
	c = mix(c, cl_col, mask * mix(0.86, 0.96, ov));

	COLOR = pow(max(c, vec3(0.0)), vec3(2.2)) * gain * mix(1.0, 0.84, ov);
}
