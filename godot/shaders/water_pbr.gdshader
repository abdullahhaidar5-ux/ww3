// $75 AAA Animated Reflective PBR Water Shader (WebGL2 Compatibility safe).
// Features: multi-directional capillary wave harmonics, crisp Fresnel sky reflections, sunlit specular sparkle,
// deep-to-shallow bathymetry tint, and organic shoreline/ford foam lace.
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, diffuse_burley, specular_schlick_ggx;

uniform vec3 sky_horizon : source_color = vec3(0.86, 0.82, 0.72);
uniform vec3 deep_color : source_color = vec3(0.05, 0.16, 0.24);
uniform vec3 shallow_color : source_color = vec3(0.16, 0.34, 0.36);
uniform float wave_speed = 0.95;
uniform float wave_scale = 0.052;
uniform float ripple_strength = 0.22;

varying vec3 v_wpos;

void vertex() {
	v_wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec2 p = v_wpos.xz * wave_scale;
	float t = TIME * wave_speed;

	// Triple-layer scrolling wave harmonics for organic ripples without visible grid patterns
	vec2 p1 = p + vec2(t * 0.65, t * 0.38);
	float ph1a = p1.x * 1.25 + p1.y * 0.72;
	float ph1b = p1.x * 2.05 - p1.y * 1.35 + t * 0.45;
	float d1x = cos(ph1a) * 1.25 + cos(ph1b) * 0.80;
	float d1z = cos(ph1a) * 0.72 - cos(ph1b) * 0.52;

	vec2 p2 = p * 2.25 + vec2(-t * 0.52, t * 0.78);
	float ph2a = p2.x * 1.65 - p2.y * 1.15;
	float ph2b = p2.x * 2.85 + p2.y * 2.15 - t * 0.85;
	float d2x = cos(ph2a) * 0.72 + cos(ph2b) * 0.42;
	float d2z = -cos(ph2a) * 0.48 + cos(ph2b) * 0.34;

	vec2 p3 = p * 4.6 + vec2(t * 0.9, -t * 0.65);
	float ph3 = p3.x * 1.4 + p3.y * 1.9;
	float d3x = cos(ph3) * 0.26;
	float d3z = cos(ph3) * 0.26;

	float nx = (d1x * 0.48 + d2x * 0.38 + d3x * 0.14) * ripple_strength;
	float nz = (d1z * 0.48 + d2z * 0.38 + d3z * 0.14) * ripple_strength;
	vec3 w_nrm = normalize(vec3(-nx, 1.0, -nz));
	vec3 v_nrm = normalize((VIEW_MATRIX * vec4(w_nrm, 0.0)).xyz);

	float ndotv = clamp(dot(v_nrm, normalize(VIEW)), 0.0, 1.0);
	float fresnel = pow(max(1.0 - ndotv, 0.0001), 3.6);
	float refl = clamp(0.10 + fresnel * 0.82, 0.0, 0.90);

	float wave_h = sin(ph1a) * 0.45 + sin(ph2a) * 0.35 + sin(ph3) * 0.20;
	float shallow_k = clamp((1.0 - COLOR.a) * 1.85, 0.0, 1.0);
	vec3 water_tint = mix(deep_color, shallow_color, shallow_k);
	water_tint *= (1.0 + wave_h * 0.09);

	vec3 col = mix(water_tint, sky_horizon * 0.78, refl * 0.68);

	// Organic animated foam lace on shallow fords & wave crests
	float foam = 0.0;
	if (COLOR.a < 0.78) {
		float ford_k = clamp((0.78 - COLOR.a) / 0.28, 0.30, 1.0);
		float lace = sin(p.x * 3.4 + p.y * 2.5 + t * 2.0) * cos(p.x * 2.1 - p.y * 3.5 - t * 1.5);
		float crest = smoothstep(0.20, 0.80, lace * 0.5 + 0.5 + wave_h * 0.30);
		foam = ford_k * crest * 0.48;
		col = mix(col, vec3(0.84, 0.89, 0.92), foam);
	}

	NORMAL = v_nrm;
	ALBEDO = col;
	ROUGHNESS = mix(0.08, 0.40, foam);
	METALLIC = mix(0.28, 0.04, foam);
	SPECULAR = 0.82;
}
