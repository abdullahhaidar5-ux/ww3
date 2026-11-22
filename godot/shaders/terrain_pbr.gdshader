// Milestone 3 Stream 1: AAA multi-texture PBR terrain shader (WebGL2 Compatibility safe).
// Dual-scale macro-blended detail textures (zero tiling), per-pixel stratified cliff rock from world normal slope,
// razor-smooth per-pixel anti-aliased roads from blurred road_tex, wet riverbanks from shore_tex, and storm wetness.
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

uniform sampler2D detail_alb : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D detail_nrm : hint_normal, filter_linear_mipmap, repeat_enable;
uniform sampler2D road_tex : filter_linear, repeat_disable;
uniform sampler2D shore_tex : filter_linear, repeat_disable;

uniform vec2 map_size = vec2(4800.0, 3320.0);
uniform vec2 road_size = vec2(0.0, 0.0);
uniform int theme_id = 0; // 0 = desert, 1 = green, 2 = snow
uniform float nrm_strength = 0.45;
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

	// Dual-scale non-integer detail sampling blended by smooth procedural macro noise (eliminates tiling)
	vec2 uv_a = v_wpos.xz / 340.0;
	vec2 uv_b = v_wpos.xz / 970.0 + vec2(0.37, 0.61);
	float macro_n = vnoise(v_wpos.xz * 0.0028);
	float detail_blend = smoothstep(0.22, 0.78, macro_n);

	vec3 det_rgb = mix(texture(detail_alb, uv_a).rgb, texture(detail_alb, uv_b).rgb, detail_blend);
	// detail_alb is source_color (linearized); sqrt restores perceptual ~0.5 mid-point for balanced modulation
	float det_lum = sqrt(clamp(dot(det_rgb, vec3(0.299, 0.587, 0.114)), 0.0, 1.0));

	vec3 nrm_a = texture(detail_nrm, uv_a).rgb;
	vec3 nrm_b = texture(detail_nrm, uv_b).rgb;
	vec3 det_nrm = mix(nrm_a, nrm_b, detail_blend);

	// Base biome albedo from smooth vertex colors subtly modulated by dual-scale detail
	float micro_mod = (theme_id == 2) ? mix(0.92, 1.07, det_lum) : mix(0.86, 1.14, det_lum);
	vec3 col = COLOR.rgb * micro_mod;
	if (theme_id == 1) {
		col *= vec3(1.12, 1.15, 1.04);   // sunlit Mediterranean olive warmth
	}
	float rough = (theme_id == 2) ? 0.80 : ((theme_id == 1) ? 0.92 : 0.94);
	float nrm_d = (theme_id == 2) ? nrm_strength * 0.65 : nrm_strength;

	// Per-pixel steep cliff rock with stratified world-space banding (edge0 < edge1 for WebGL2 spec safety)
	vec3 wn = normalize(v_wnrm);
	float slope = 1.0 - smoothstep(0.68, 0.92, clamp(wn.y, 0.0, 1.0));
	if (slope > 0.001) {
		float strata_warp = vnoise(v_wpos.xz * 0.012) * 14.0 + vnoise(v_wpos.xz * 0.035) * 4.5;
		float strata_a = sin((v_wpos.y + strata_warp) * 0.28) * 0.5 + 0.5;
		float strata_b = sin((v_wpos.y * 0.85 + strata_warp * 0.60)) * 0.5 + 0.5;
		float strata = mix(strata_a, strata_b, 0.35);

		vec3 rock_lo;
		vec3 rock_hi;
		if (theme_id == 2) {
			// Snow: dark slate cliff rock
			rock_lo = vec3(0.24, 0.27, 0.32);
			rock_hi = vec3(0.42, 0.45, 0.50);
		} else if (theme_id == 1) {
			// Green: grey limestone cliff rock
			rock_lo = vec3(0.36, 0.37, 0.35);
			rock_hi = vec3(0.55, 0.55, 0.51);
		} else {
			// Desert: warm stratified sandstone rock
			rock_lo = vec3(0.42, 0.33, 0.24);
			rock_hi = vec3(0.62, 0.50, 0.37);
		}
		vec3 rock_col = mix(rock_lo, rock_hi, strata) * mix(0.82, 1.18, det_lum);
		col = mix(col, rock_col, slope);
		rough = mix(rough, 0.86, slope);
		nrm_d = mix(nrm_d, nrm_strength * 1.65, slope);
		det_nrm = mix(det_nrm, nrm_a, slope * 0.65);
	}

	// Per-pixel anti-aliased roads from bilinearly filtered road_tex (zero vertex staircasing)
	float r_raw = texture(road_tex, ruv).r;
	float r_shoulder = smoothstep(0.12, 0.45, r_raw);
	float r_surface = smoothstep(0.42, 0.72, r_raw);
	if (r_shoulder > 0.001) {
		float r_wear = vnoise(v_wpos.xz * 0.045) * 0.65 + vnoise(v_wpos.xz * 0.14) * 0.35;
		vec3 road_col;
		vec3 shoulder_col;
		if (theme_id == 2) {
			// Snow: sunlit cleared gravel/stone road
			road_col = vec3(0.68, 0.70, 0.73);
			shoulder_col = vec3(0.81, 0.84, 0.88);
		} else if (theme_id == 1) {
			// Green: sunlit compacted dirt & weathered gravel road
			road_col = vec3(0.60, 0.54, 0.44);
			shoulder_col = vec3(0.54, 0.51, 0.39);
		} else {
			// Desert: sunlit ochre packed road
			road_col = vec3(0.68, 0.60, 0.48);
			shoulder_col = vec3(0.76, 0.67, 0.53);
		}
		road_col *= mix(0.92, 1.08, r_wear);
		shoulder_col *= mix(0.94, 1.06, r_wear);

		col = mix(col, shoulder_col, r_shoulder * 0.45);
		col = mix(col, road_col, r_surface);
		rough = mix(rough, 0.82, r_surface);
		nrm_d = mix(nrm_d, 0.22, r_surface);
	}

	// Damp darkened riverbanks from blurred shore_tex
	float wet_shore = smoothstep(0.05, 0.55, texture(shore_tex, muv).r);
	col *= mix(1.0, 0.74, wet_shore);
	rough = mix(rough, 0.55, wet_shore);

	// Dynamic rain/storm wetness
	float w_amt = clamp(wetness, 0.0, 1.0);
	col *= mix(1.0, 0.78, w_amt);
	rough = mix(rough, 0.42, w_amt);

	ALBEDO = srgb_to_linear(col);
	ROUGHNESS = rough;
	METALLIC = 0.0;
	SPECULAR = mix(0.35, 0.60, max(wet_shore * 0.6, w_amt));
	NORMAL_MAP = det_nrm;
	NORMAL_MAP_DEPTH = nrm_d;
}
