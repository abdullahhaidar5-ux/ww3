// Milestone 3 Stream 1: Animated reflective PBR water shader (WebGL2 Compatibility safe, zero texture lookups).
// Dual-scrolling analytical wave ripple normals, Fresnel sky-horizon reflection, crisp sun specular glints,
// and subtle animated shoreline foam shimmer on shallow ford cells (COLOR.a < 0.75).
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, diffuse_burley, specular_schlick_ggx;

uniform vec3 sky_horizon : source_color = vec3(0.86, 0.78, 0.64);
uniform float wave_speed = 1.0;
uniform float wave_scale = 0.055;
uniform float ripple_strength = 0.24;

varying vec3 v_wpos;

void vertex() {
	v_wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec2 p = v_wpos.xz * wave_scale;
	float t = TIME * wave_speed;

	// Dual scrolling procedural wave harmonics with analytical partial derivatives
	vec2 p1 = p + vec2(t * 0.72, t * 0.41);
	float ph1a = p1.x * 1.30 + p1.y * 0.70;
	float ph1b = p1.x * 2.10 - p1.y * 1.40 + t * 0.50;
	float d1x = cos(ph1a) * 1.30 + cos(ph1b) * 0.85;
	float d1z = cos(ph1a) * 0.70 - cos(ph1b) * 0.55;

	vec2 p2 = p * 2.35 + vec2(-t * 0.58, t * 0.83);
	float ph2a = p2.x * 1.70 - p2.y * 1.10;
	float ph2b = p2.x * 2.90 + p2.y * 2.20 - t * 0.90;
	float d2x = cos(ph2a) * 0.75 + cos(ph2b) * 0.45;
	float d2z = -cos(ph2a) * 0.50 + cos(ph2b) * 0.35;

	float nx = (d1x * 0.55 + d2x * 0.45) * ripple_strength;
	float nz = (d1z * 0.55 + d2z * 0.45) * ripple_strength;
	vec3 w_nrm = normalize(vec3(-nx, 1.0, -nz));
	vec3 v_nrm = normalize((VIEW_MATRIX * vec4(w_nrm, 0.0)).xyz);

	// Fresnel rim reflection blending water depth tint toward warm sky horizon at grazing angles
	float ndotv = clamp(dot(v_nrm, normalize(VIEW)), 0.0, 1.0);
	float fresnel = pow(max(1.0 - ndotv, 0.0001), 3.2);
	float refl = clamp(0.08 + fresnel * 0.78, 0.0, 0.88);

	float wave_h = sin(ph1a) * 0.5 + sin(ph2a) * 0.5;
	vec3 base_water = COLOR.rgb * (1.0 + wave_h * 0.08);
	vec3 col = mix(base_water, sky_horizon * 0.72, refl * 0.65);

	// Subtle animated shoreline foam shimmer on shallow ford cells (COLOR.a < 0.75)
	float foam = 0.0;
	if (COLOR.a < 0.75) {
		float ford_k = clamp((0.75 - COLOR.a) / 0.25, 0.35, 1.0);
		float foam_pat = sin(p.x * 3.1 + p.y * 2.4 + t * 2.1) * cos(p.x * 1.9 - p.y * 3.3 - t * 1.6);
		float foam_crest = smoothstep(0.24, 0.82, foam_pat * 0.5 + 0.5 + wave_h * 0.28);
		foam = ford_k * foam_crest * 0.42;
		col = mix(col, vec3(0.76, 0.82, 0.85), foam);
	}

	NORMAL = v_nrm;
	ALBEDO = col;
	ROUGHNESS = mix(0.12, 0.42, foam);
	METALLIC = mix(0.25, 0.04, foam);
	SPECULAR = 0.75;
}
