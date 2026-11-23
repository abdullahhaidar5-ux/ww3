// CoH3 / Zero Hour AAA multi-layer PBR terrain shader (WebGL2 Compatibility safe).
// Features: non-tiling tri-scale detail textures, procedural wind-rippled dunes & dry clay/gravel patches,
// stratified sedimentary cliff rock with crevice darkening, weathered military roads with dual tire ruts & gravel curbs,
// damp shoreline sediment, and dynamic storm wetness.
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

uniform sampler2D detail_alb : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D detail_nrm : hint_normal, filter_linear_mipmap, repeat_enable;
uniform sampler2D road_tex : filter_linear, repeat_disable;
uniform sampler2D shore_tex : filter_linear, repeat_disable;

uniform vec2 map_size = vec2(4800.0, 3320.0);
uniform vec2 road_size = vec2(0.0, 0.0);
uniform int theme_id = 0; // 0 = desert, 1 = green, 2 = snow
uniform float nrm_strength = 0.52;
uniform float wetness = 0.0;

varying vec3 v_wpos;
varying vec3 v_wnrm;

float hash21(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	float a = hash21(i);
	float b = hash21(i + vec2(1.0, 0.0));
	float c = hash21(i + vec2(0.0, 1.0));
	float d = hash21(i + vec2(1.0, 1.0));
	return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm2(vec2 p) {
	return vnoise(p) * 0.65 + vnoise(p * 2.13 + vec2(17.3, 9.2)) * 0.35;
}

vec3 srgb_to_linear(vec3 c) {
	vec3 clamped = max(c, vec3(0.0));
	return mix(clamped / 12.92, pow((clamped + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), clamped));
}

void vertex() {
	v_wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_wnrm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec2 muv = clamp(v_wpos.xz / max(map_size, vec2(1.0)), vec2(0.0), vec2(1.0));
	vec2 rsize = (road_size.x > 0.5 && road_size.y > 0.5) ? road_size : max(map_size, vec2(1.0));
	vec2 ruv = clamp(v_wpos.xz / rsize, vec2(0.0), vec2(1.0));

	// Tri-scale non-integer detail sampling blended by procedural geological macro noise (zero tiling)
	vec2 uv_fine = v_wpos.xz / 145.0;
	vec2 uv_a = v_wpos.xz / 340.0;
	vec2 uv_b = v_wpos.xz / 920.0 + vec2(0.37, 0.61);
	float macro_n = fbm2(v_wpos.xz * 0.0024);
	float patch_n = fbm2(v_wpos.xz * 0.0085 + vec2(4.2, -3.1));
	float detail_blend = smoothstep(0.20, 0.80, macro_n);

	vec3 det_rgb = mix(texture(detail_alb, uv_a).rgb, texture(detail_alb, uv_b).rgb, detail_blend);
	vec3 det_fine = texture(detail_alb, uv_fine).rgb;
	float det_lum = sqrt(clamp(dot(mix(det_rgb, det_fine, 0.38), vec3(0.299, 0.587, 0.114)), 0.0, 1.0));

	vec3 nrm_a = texture(detail_nrm, uv_a).rgb;
	vec3 nrm_b = texture(detail_nrm, uv_b).rgb;
	vec3 nrm_f = texture(detail_nrm, uv_fine).rgb;
	vec3 det_nrm = normalize(mix(mix(nrm_a, nrm_b, detail_blend), nrm_f, 0.32));

	// Rich CoH3 / Zero Hour biome ground synthesis
	vec3 col = COLOR.rgb;
	float rough = 0.93;
	float nrm_d = nrm_strength;

	if (theme_id == 0) {
		// Desert: rich sunlit CoH3 North African sandstone, terracotta gravel, wind-carved sand ripples & crisp micro-grit
		vec3 sand_light = vec3(0.75, 0.65, 0.50);
		vec3 clay_gravel = vec3(0.59, 0.49, 0.36);
		vec3 scrub_earth = vec3(0.49, 0.43, 0.31);
		float ripple_phase = (v_wpos.x * 0.13 + v_wpos.z * 0.075) + vnoise(v_wpos.xz * 0.018) * 5.6;
		float ripples = sin(ripple_phase) * 0.5 + 0.5;
		float grit = vnoise(v_wpos.xz * 0.24) * 0.6 + vnoise(v_wpos.xz * 0.68) * 0.4;
		vec3 desert_var = mix(clay_gravel, sand_light, smoothstep(0.24, 0.78, macro_n));
		desert_var = mix(desert_var, scrub_earth, smoothstep(0.62, 0.88, patch_n) * 0.46);
		col = mix(col * vec3(0.94, 0.91, 0.86), desert_var, 0.66);
		col *= mix(0.82, 1.15, det_lum) * mix(0.94, 1.05, ripples) * mix(0.94, 1.06, grit);
		rough = mix(0.95, 0.86, smoothstep(0.50, 0.84, patch_n));
		nrm_d = nrm_strength * mix(0.95, 1.28, ripples);
	} else if (theme_id == 1) {
		// Mediterranean / Green: sunlit olive grass, dry golden-tan hillside patches & earthy soil grit
		vec3 meadow = vec3(0.41, 0.50, 0.28);
		vec3 dry_grass = vec3(0.59, 0.54, 0.35);
		vec3 dark_loam = vec3(0.30, 0.36, 0.21);
		vec3 grn_var = mix(dark_loam, meadow, smoothstep(0.25, 0.72, macro_n));
		grn_var = mix(grn_var, dry_grass, smoothstep(0.58, 0.88, patch_n) * 0.55);
		col = mix(col * vec3(1.06, 1.08, 1.00), grn_var, 0.56);
		col *= mix(0.84, 1.14, det_lum);
		rough = 0.91;
	} else {
		// Snow: wind-packed powder with sculpted drift ridges (sastrugi), cool blue-grey hollows, crunchy surface grain
		// and patches where the wind has scoured the snow thin over frozen earth / dead grass - never one flat white sheet
		vec3 snow_hi = vec3(0.80, 0.84, 0.90);
		vec3 snow_drift = vec3(0.60, 0.67, 0.77);
		vec3 thin_snow = vec3(0.52, 0.53, 0.52);
		float drift_phase = (v_wpos.x * 0.045 - v_wpos.z * 0.028) + vnoise(v_wpos.xz * 0.011) * 6.5;
		float drifts = sin(drift_phase) * 0.5 + 0.5;
		float grain = vnoise(v_wpos.xz * 0.31) * 0.6 + vnoise(v_wpos.xz * 0.83) * 0.4;
		vec3 snow_var = mix(snow_drift, snow_hi, smoothstep(0.22, 0.80, macro_n));
		snow_var = mix(snow_var, thin_snow, smoothstep(0.66, 0.92, patch_n) * 0.42);
		col = mix(col, snow_var, 0.62);
		col *= mix(0.80, 1.10, det_lum) * mix(0.93, 1.05, drifts) * mix(0.95, 1.04, grain);
		rough = mix(0.72, 0.90, det_lum);
		nrm_d = nrm_strength * mix(0.85, 1.25, drifts);
	}

	// Per-pixel steep cliff rock with stratified world-space sedimentary layers & crevice AO
	vec3 wn = normalize(v_wnrm);
	float slope = 1.0 - smoothstep(0.70, 0.93, clamp(wn.y, 0.0, 1.0));
	if (slope > 0.001) {
		float strata_warp = vnoise(v_wpos.xz * 0.012) * 14.0 + vnoise(v_wpos.xz * 0.035) * 4.5;
		float strata_a = sin((v_wpos.y + strata_warp) * 0.32) * 0.5 + 0.5;
		float strata_b = sin((v_wpos.y * 0.92 + strata_warp * 0.60)) * 0.5 + 0.5;
		float strata = mix(strata_a, strata_b, 0.35);
		float crack = smoothstep(0.18, 0.45, det_lum);

		vec3 rock_lo;
		vec3 rock_hi;
		if (theme_id == 2) {
			rock_lo = vec3(0.28, 0.31, 0.36);
			rock_hi = vec3(0.48, 0.51, 0.56);
		} else if (theme_id == 1) {
			rock_lo = vec3(0.38, 0.38, 0.36);
			rock_hi = vec3(0.58, 0.57, 0.52);
		} else {
			// Sun-baked sandstone & ochre limestone cliffs
			rock_lo = vec3(0.44, 0.36, 0.27);
			rock_hi = vec3(0.66, 0.54, 0.41);
		}
		vec3 rock_col = mix(rock_lo, rock_hi, strata) * mix(0.78, 1.16, crack);
		col = mix(col, rock_col, slope);
		rough = mix(rough, 0.86, slope);
		nrm_d = mix(nrm_d, nrm_strength * 1.80, slope);
		det_nrm = mix(det_nrm, nrm_a, slope * 0.65);
	}

	// Per-pixel crisp military roads: noise-broken sand shoulder + weathered sun-bleached asphalt/gravel roadbed + dual tire tracks
	float r_raw = texture(road_tex, ruv).r;
	if (r_raw > 0.04) {
		float r_wear = vnoise(v_wpos.xz * 0.055) * 0.58 + vnoise(v_wpos.xz * 0.20) * 0.42;
		float r_asph = vnoise(v_wpos.xz * 0.72);
		float r_edge = r_raw + (r_wear - 0.5) * 0.16;
		float r_shoulder = smoothstep(0.18, 0.40, r_edge);
		float r_surface = smoothstep(0.42, 0.58, r_edge);
		// Dual wheel-rut bands inside the carriageway (r_raw ~ 0.58..0.88)
		float rut_band = smoothstep(0.52, 0.64, r_raw) * (1.0 - smoothstep(0.76, 0.90, r_raw));
		// Subtle wind-blown sand drifts creeping over road margins
		float edge_sand = (1.0 - smoothstep(0.56, 0.84, r_raw)) * smoothstep(0.42, 0.82, patch_n) * 0.45;

		vec3 road_col;
		vec3 shoulder_col;
		if (theme_id == 2) {
			// ploughed, vehicle-churned slush: muddy brown-grey ruts with dirty packed-snow banks (not blue ice)
			road_col = vec3(0.56, 0.53, 0.50);
			shoulder_col = vec3(0.66, 0.67, 0.69);
		} else if (theme_id == 1) {
			road_col = vec3(0.44, 0.43, 0.40);
			shoulder_col = vec3(0.54, 0.50, 0.40);
		} else {
			// Sun-faded weathered grey-tan tarmac & compacted gravel road (CoH3 North Africa highway)
			road_col = vec3(0.49, 0.47, 0.44);
			shoulder_col = vec3(0.69, 0.61, 0.48);
		}
		road_col *= mix(0.88, 1.11, r_wear) * mix(0.94, 1.06, r_asph) * mix(1.0, 0.86, rut_band * 0.75);
		road_col = mix(road_col, col, edge_sand);
		shoulder_col *= mix(0.91, 1.07, r_wear);

		col = mix(col, shoulder_col, r_shoulder * 0.52);
		col = mix(col, road_col, r_surface * 0.92);
		rough = mix(rough, 0.78, r_surface);
		nrm_d = mix(nrm_d, 0.34, r_surface);
	}

	// Damp darkened riverbanks & sediment transition from blurred shore_tex
	float wet_shore = smoothstep(0.05, 0.55, texture(shore_tex, muv).r);
	col *= mix(1.0, 0.76, wet_shore);
	rough = mix(rough, 0.50, wet_shore);

	// Dynamic rain/storm wetness
	float w_amt = clamp(wetness, 0.0, 1.0);
	col *= mix(1.0, 0.78, w_amt);
	rough = mix(rough, 0.38, w_amt);

	ALBEDO = srgb_to_linear(col);
	ROUGHNESS = rough;
	METALLIC = 0.0;
	SPECULAR = mix(0.28, 0.58, max(wet_shore * 0.6, w_amt));
	NORMAL_MAP = det_nrm;
	NORMAL_MAP_DEPTH = nrm_d;
}
