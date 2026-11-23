// Epic Animated Reflective PBR Water Shader (WebGL2 Compatibility safe).
// Features: multi-directional capillary wave harmonics, crisp Fresnel sky reflections, sparkling golden sun-glint
// highlights across wave crests, deep sapphire-to-turquoise bathymetry tint, and organic shoreline/ford foam lace.
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, diffuse_burley, specular_schlick_ggx;

uniform vec3 sky_horizon : source_color = vec3(0.86, 0.82, 0.72);
uniform vec3 deep_color : source_color = vec3(0.04, 0.14, 0.24);
uniform vec3 shallow_color : source_color = vec3(0.14, 0.36, 0.40);
uniform vec3 sun_dir = vec3(-0.75, 0.48, -0.44);
uniform float wave_speed = 1.05;
uniform float wave_scale = 0.054;
uniform float ripple_strength = 0.25;

varying vec3 v_wpos;

void vertex() {
	v_wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	vec2 p = v_wpos.xz * wave_scale;
	float t = TIME * wave_speed;

	// Triple-layer scrolling wave harmonics for organic ripples without visible grid patterns
	vec2 p1 = p + vec2(t * 0.68, t * 0.40);
	float ph1a = p1.x * 1.25 + p1.y * 0.72;
	float ph1b = p1.x * 2.05 - p1.y * 1.35 + t * 0.48;
	float d1x = cos(ph1a) * 1.25 + cos(ph1b) * 0.80;
	float d1z = cos(ph1a) * 0.72 - cos(ph1b) * 0.52;

	vec2 p2 = p * 2.25 + vec2(-t * 0.54, t * 0.80);
	float ph2a = p2.x * 1.65 - p2.y * 1.15;
	float ph2b = p2.x * 2.85 + p2.y * 2.15 - t * 0.88;
	float d2x = cos(ph2a) * 0.72 + cos(ph2b) * 0.42;
	float d2z = -cos(ph2a) * 0.48 + cos(ph2b) * 0.34;

	vec2 p3 = p * 4.8 + vec2(t * 0.95, -t * 0.68);
	float ph3 = p3.x * 1.4 + p3.y * 1.9;
	float d3x = cos(ph3) * 0.28;
	float d3z = cos(ph3) * 0.28;

	float nx = (d1x * 0.48 + d2x * 0.38 + d3x * 0.14) * ripple_strength;
	float nz = (d1z * 0.48 + d2z * 0.38 + d3z * 0.14) * ripple_strength;
	vec3 w_nrm = normalize(vec3(-nx, 1.0, -nz));
	vec3 v_nrm = normalize((VIEW_MATRIX * vec4(w_nrm, 0.0)).xyz);

	float ndotv = clamp(dot(v_nrm, normalize(VIEW)), 0.0, 1.0);
	float fresnel = pow(max(1.0 - ndotv, 0.0001), 3.4);
	float refl = clamp(0.12 + fresnel * 0.84, 0.0, 0.92);

	float wave_h = sin(ph1a) * 0.45 + sin(ph2a) * 0.35 + sin(ph3) * 0.20;
	float shallow_k = clamp((1.0 - COLOR.a) * 1.85, 0.0, 1.0);
	vec3 water_tint = mix(deep_color, shallow_color, shallow_k);
	water_tint *= (1.0 + wave_h * 0.11);

	vec3 col = mix(water_tint, sky_horizon * 0.84, refl * 0.72);

	// Sparkling golden sun-glint specular shimmer across moving wave crests
	vec3 v_sun = normalize((VIEW_MATRIX * vec4(normalize(sun_dir), 0.0)).xyz);
	vec3 h_vec = normalize(v_sun + normalize(VIEW));
	float glint = pow(max(dot(v_nrm, h_vec), 0.0), 110.0);
	col += vec3(1.15, 0.98, 0.74) * glint * 0.85;

	// Organic animated foam lace on shallow fords & wave crests
	float foam = 0.0;
	if (COLOR.a < 0.80) {
		float ford_k = clamp((0.80 - COLOR.a) / 0.28, 0.32, 1.0);
		float lace = sin(p.x * 3.4 + p.y * 2.5 + t * 2.1) * cos(p.x * 2.1 - p.y * 3.5 - t * 1.6);
		float crest = smoothstep(0.18, 0.78, lace * 0.5 + 0.5 + wave_h * 0.32);
		foam = ford_k * crest * 0.54;
		col = mix(col, vec3(0.88, 0.93, 0.96), foam);
	}

	NORMAL = v_nrm;
	ALBEDO = col;
	ROUGHNESS = mix(0.06, 0.38, foam);
	METALLIC = mix(0.32, 0.04, foam);
	SPECULAR = 0.88;
}
