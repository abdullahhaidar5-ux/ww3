// Realistic Tactical PBR Dielectric Water Shader (WebGL2 Compatibility safe, zero depth-texture reads).
// Features: dark steel-blue / slate-teal bathymetry, multi-directional capillary ripples, dynamic time-of-day
// zenith-to-horizon Fresnel reflections, crisp oblique sun-glint shimmer, and smooth shoreline alpha fade.
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, diffuse_burley, specular_schlick_ggx;

uniform vec3 sky_horizon : source_color = vec3(0.86, 0.82, 0.72);
uniform vec3 sky_zenith : source_color = vec3(0.14, 0.34, 0.72);
uniform vec3 sun_color : source_color = vec3(1.0, 0.92, 0.78);
uniform vec3 deep_color : source_color = vec3(0.03, 0.09, 0.15);
uniform vec3 shallow_color : source_color = vec3(0.09, 0.22, 0.26);
uniform vec3 sun_dir = vec3(-0.82, 0.36, -0.44);
uniform float wave_speed = 1.05;
uniform float wave_scale = 0.054;
uniform float ripple_strength = 0.24;

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

	// Physically accurate dielectric Fresnel blending sky_zenith (overhead) to sky_horizon (grazing)
	float ndotv = clamp(dot(v_nrm, normalize(VIEW)), 0.0, 1.0);
	float fresnel = pow(max(1.0 - ndotv, 0.0001), 4.0);
	float refl = clamp(0.07 + fresnel * 0.84, 0.0, 0.91);
	vec3 sky_refl = mix(sky_zenith * 0.72, sky_horizon * 0.90, clamp(pow(1.0 - ndotv, 1.5), 0.0, 1.0));

	float wave_h = sin(ph1a) * 0.45 + sin(ph2a) * 0.35 + sin(ph3) * 0.20;
	float shallow_k = clamp((1.0 - COLOR.a) * 1.55, 0.0, 1.0);
	vec3 water_tint = mix(deep_color, shallow_color, shallow_k);
	water_tint *= (1.0 + wave_h * 0.10);

	vec3 col = mix(water_tint, sky_refl, refl * 0.74);

	// Dynamic time-of-day oblique solar glint across moving capillary wave crests
	vec3 s_wdir = normalize(sun_dir);
	vec3 v_sun = normalize((VIEW_MATRIX * vec4(s_wdir, 0.0)).xyz);
	vec3 h_vec = normalize(v_sun + normalize(VIEW));
	float ndoth = max(dot(v_nrm, h_vec), 0.0);
	float sun_up = smoothstep(-0.02, 0.16, s_wdir.y);
	float glint = (pow(ndoth, 145.0) * 1.10 + pow(ndoth, 34.0) * 0.12) * sun_up;
	col += sun_color * glint;

	// Organic animated foam lace on shallow fords & shorelines
	float foam = 0.0;
	if (COLOR.a < 0.76) {
		float ford_k = clamp((0.76 - COLOR.a) / 0.38, 0.22, 1.0);
		float lace = sin(p.x * 3.4 + p.y * 2.5 + t * 2.1) * cos(p.x * 2.1 - p.y * 3.5 - t * 1.6);
		float crest = smoothstep(0.24, 0.80, lace * 0.5 + 0.5 + wave_h * 0.30);
		foam = ford_k * crest * 0.46;
		vec3 foam_col = mix(vec3(0.76, 0.82, 0.86), sky_horizon, 0.25);
		col = mix(col, foam_col, foam);
	}

	NORMAL = v_nrm;
	ALBEDO = col;
	ALPHA = clamp(0.45 + COLOR.a * 0.52, 0.45, 0.97);
	ROUGHNESS = mix(0.07, 0.42, foam);
	METALLIC = 0.0;
	SPECULAR = mix(0.74, 0.24, foam);
}
