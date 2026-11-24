// $75 AAA Zero Hour Enhanced / CoH3 Multi-Layer PBR Terrain Shader (WebGL2 Compatibility safe, physically calibrated linear space).
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

uniform sampler2D biome_alb : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D biome_nrm : hint_normal, filter_linear_mipmap, repeat_enable;
uniform sampler2D rock_alb : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D rock_nrm : hint_normal, filter_linear_mipmap, repeat_enable;
uniform sampler2D road_alb : source_color, filter_linear_mipmap, repeat_enable;
uniform sampler2D road_nrm : hint_normal, filter_linear_mipmap, repeat_enable;
uniform sampler2D road_tex : filter_linear, repeat_disable;
uniform sampler2D shore_tex : filter_linear, repeat_disable;

uniform vec2 map_size = vec2(4800.0, 3320.0);
uniform vec2 road_size = vec2(0.0, 0.0);
uniform int theme_id = 0; // 0 = desert, 1 = green, 2 = snow
uniform float nrm_strength = 0.55;
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
	return vnoise(p) * 0.64 + vnoise(p * 2.17 + vec2(17.3, 9.2)) * 0.36;
}

vec3 s2l(vec3 c) {
	vec3 cl = max(c, vec3(0.0));
	return mix(cl / 12.92, pow((cl + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), cl));
}

void vertex() {
	v_wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_wnrm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec2 muv = clamp(v_wpos.xz / max(map_size, vec2(1.0)), vec2(0.0), vec2(1.0));
	vec2 rsize = (road_size.x > 0.5 && road_size.y > 0.5) ? road_size : max(map_size, vec2(1.0));
	vec2 ruv = clamp(v_wpos.xz / rsize, vec2(0.0), vec2(1.0));

	// Geological macro, meso & battlefield soil variation (photographic CoH3 / Zero Hour Enhanced terrain breakup)
	float macro_n = fbm2(v_wpos.xz * 0.0014);
	float meso_n = fbm2(v_wpos.xz * 0.0052 + vec2(4.2, -3.1));
	float wadi_n = fbm2(v_wpos.xz * 0.0028 + vec2(-8.4, 5.7));
	float detail_blend = smoothstep(0.18, 0.82, macro_n);

	// Tri-scale rotated UVs so tiling is completely invisible at any altitude
	vec2 uv_fine = v_wpos.xz / 145.0;
	vec2 uv_med = v_wpos.xz / 340.0 + vec2(0.23, 0.17);
	vec2 uv_far = vec2(v_wpos.x * 0.866 - v_wpos.z * 0.5, v_wpos.x * 0.5 + v_wpos.z * 0.866) / 820.0 + vec2(0.41, 0.63);

	vec3 b_fine = texture(biome_alb, uv_fine).rgb;
	vec3 b_med = texture(biome_alb, uv_med).rgb;
	vec3 b_far = texture(biome_alb, uv_far).rgb;
	vec3 base_lin = mix(mix(b_med, b_far, detail_blend * 0.52), b_fine, 0.36);

	vec3 n_fine = texture(biome_nrm, uv_fine).rgb;
	vec3 n_med = texture(biome_nrm, uv_med).rgb;
	vec3 n_far = texture(biome_nrm, uv_far).rgb;
	vec3 det_nrm = normalize(mix(mix(n_med, n_far, detail_blend * 0.45), n_fine, 0.38));

	// Baked concavity/valley AO stored in vertex COLOR.a
	float cavity_ao = clamp(mix(1.0, COLOR.a, 1.25), 0.74, 1.10);
	vec3 v_lin = s2l(COLOR.rgb);

	vec3 alb;
	float rough = 0.93;
	float nrm_d = nrm_strength;
	float spec = 0.20;

	if (theme_id == 0) {
		// Desert (Systemic War / Levant): calm photographic weathered sandstone-taupe, dusty hardpack & dry arid gravel wadis
		vec3 sand_hi = s2l(vec3(0.61, 0.55, 0.45));
		vec3 hardpack = s2l(vec3(0.50, 0.44, 0.36));
		vec3 scrub_earth = s2l(vec3(0.39, 0.34, 0.27));
		vec3 macro_c = mix(hardpack, sand_hi, smoothstep(0.20, 0.80, macro_n));
		macro_c = mix(macro_c, scrub_earth, smoothstep(0.52, 0.84, meso_n) * 0.52);
		float wadi = smoothstep(0.60, 0.76, wadi_n) * (1.0 - smoothstep(0.76, 0.92, wadi_n));
		macro_c = mix(macro_c, scrub_earth * 0.86, wadi * 0.44);
		vec3 tex_mod = mix(vec3(1.0), base_lin / 0.34, 0.62);
		alb = mix(v_lin * 0.68, macro_c, 0.78) * tex_mod;
		rough = mix(0.96, 0.88, smoothstep(0.42, 0.82, meso_n));
		nrm_d = 0.44;
	} else if (theme_id == 1) {
		// European / Mediterranean Green (Systemic War / Sudden Strike 5): sunlit olive-sage meadows, agricultural patchwork & warm earth
		vec3 meadow = s2l(vec3(0.36, 0.42, 0.26));
		vec3 dry_hill = s2l(vec3(0.50, 0.46, 0.33));
		vec3 dark_loam = s2l(vec3(0.27, 0.31, 0.20));
		vec3 mud_earth = s2l(vec3(0.35, 0.31, 0.23));
		vec3 crop_gold = s2l(vec3(0.47, 0.44, 0.29));
		// Subtle large-scale agricultural patchwork fields rotated slightly off world axes
		vec2 f_uv = vec2(v_wpos.x * 0.94 - v_wpos.z * 0.34, v_wpos.x * 0.34 + v_wpos.z * 0.94) / 420.0;
		float field_id = hash21(floor(f_uv));
		vec2 f_frac = fract(f_uv);
		float field_edge = smoothstep(0.0, 0.06, f_frac.x) * smoothstep(1.0, 0.94, f_frac.x)
			* smoothstep(0.0, 0.06, f_frac.y) * smoothstep(1.0, 0.94, f_frac.y);
		float field_mask = smoothstep(0.48, 0.78, field_id) * field_edge * 0.36;
		vec3 macro_c = mix(dark_loam, meadow, smoothstep(0.20, 0.78, macro_n));
		macro_c = mix(macro_c, crop_gold, field_mask);
		macro_c = mix(macro_c, dry_hill, smoothstep(0.48, 0.84, meso_n) * 0.52);
		macro_c = mix(macro_c, mud_earth, smoothstep(0.62, 0.88, wadi_n) * 0.46);
		vec3 tex_mod = mix(vec3(1.0), base_lin / 0.14, 0.58);
		alb = mix(v_lin * 0.56, macro_c, 0.82) * tex_mod;
		rough = mix(0.95, 0.86, smoothstep(0.50, 0.84, meso_n));
		nrm_d = 0.48;
	} else {
		// Alpine Snow: crisp wind-carved powder, cold slate-blue drift hollows & exposed frozen permafrost ridges
		vec3 snow_hi = s2l(vec3(0.76, 0.81, 0.88));
		vec3 snow_lo = s2l(vec3(0.50, 0.58, 0.70));
		vec3 frozen_earth = s2l(vec3(0.31, 0.31, 0.31));
		vec3 macro_c = mix(snow_lo, snow_hi, smoothstep(0.18, 0.82, macro_n));
		macro_c = mix(macro_c, frozen_earth, smoothstep(0.62, 0.88, meso_n) * 0.48);
		vec3 tex_mod = mix(vec3(1.0), base_lin / 0.60, 0.66);
		alb = mix(v_lin * 0.76, macro_c, 0.76) * tex_mod;
		rough = mix(0.64, 0.88, smoothstep(0.32, 0.74, meso_n));
		nrm_d = 0.44;
	}

	alb *= cavity_ao;

	// Steep cliff faces & rocky scree/talus skirts around mountain bases (axis-dominant triplanar prevents diagonal strata stretch!)
	vec3 wn = normalize(v_wnrm);
	float slope_raw = 1.0 - clamp(wn.y, 0.0, 1.0);
	float scree = smoothstep(0.035, 0.11, slope_raw + (meso_n - 0.5) * 0.03) * 0.42;
	float slope = smoothstep(0.06, 0.23, slope_raw + (meso_n - 0.5) * 0.04);
	float rock_blend = clamp(max(slope, scree * smoothstep(0.35, 0.75, meso_n)), 0.0, 1.0);
	if (rock_blend > 0.002) {
		vec2 cliff_xy = (abs(wn.x) > abs(wn.z)) ? v_wpos.zy : v_wpos.xy;
		vec2 rock_uv = vec2(cliff_xy.x / 210.0, cliff_xy.y / 82.0 + macro_n * 0.26);
		vec2 rock_uv2 = v_wpos.xz / 180.0;
		vec3 r_lin = mix(texture(rock_alb, rock_uv).rgb, texture(rock_alb, rock_uv2).rgb, 0.32);
		vec3 r_nrm = normalize(mix(texture(rock_nrm, rock_uv).rgb, texture(rock_nrm, rock_uv2).rgb, 0.32));

		vec3 rock_pal;
		if (theme_id == 2) {
			rock_pal = s2l(vec3(0.34, 0.38, 0.45));     // dark alpine granite
		} else if (theme_id == 1) {
			rock_pal = s2l(vec3(0.42, 0.41, 0.38));     // weathered European limestone
		} else {
			rock_pal = s2l(vec3(0.48, 0.41, 0.32));     // stratified canyon sandstone cliffs
		}
		vec3 rock_c = rock_pal * mix(vec3(1.0), r_lin / 0.25, 0.84) * cavity_ao;
		alb = mix(alb, rock_c, rock_blend);
		rough = mix(rough, 0.86, rock_blend);
		det_nrm = normalize(mix(det_nrm, r_nrm, rock_blend * 0.86));
		nrm_d = mix(nrm_d, 1.28, rock_blend);
	}

	// HIGH-CONTRAST MILITARY HIGHWAYS: dark weathered slate asphalt, subtle broken center dashes, gravel shoulders & twin armored tire ruts
	float r_raw = texture(road_tex, ruv).r;
	if (r_raw > 0.04) {
		float r_noise = vnoise(v_wpos.xz * 0.048) * 0.62 + vnoise(v_wpos.xz * 0.16) * 0.38;
		float r_edge = r_raw + (r_noise - 0.5) * 0.085;
		float r_shoulder = smoothstep(0.16, 0.40, r_edge);
		float r_surface = smoothstep(0.46, 0.58, r_edge);
		float r_curb = smoothstep(0.42, 0.50, r_raw) * (1.0 - smoothstep(0.50, 0.60, r_raw));
		// Twin armored-column tire wear tracks along both lanes + lighter weathered crown along center
		float tire_band = smoothstep(0.58, 0.70, r_raw) * (1.0 - smoothstep(0.76, 0.88, r_raw));
		float crown_hi = smoothstep(0.86, 0.96, r_raw) * (0.45 + 0.55 * r_noise);
		float edge_dust = (1.0 - smoothstep(0.56, 0.84, r_raw)) * smoothstep(0.34, 0.82, meso_n) * 0.40;

		// Subtle broken painted highway center lane dashes along road centerline (auto-oriented via road_tex ridge curvature)
		float center_dash = 0.0;
		if (r_raw > 0.87) {
			vec2 eps = vec2(26.0) / max(rsize, vec2(1.0));
			float rxp = texture(road_tex, ruv + vec2(eps.x, 0.0)).r;
			float rxm = texture(road_tex, ruv - vec2(eps.x, 0.0)).r;
			float rzp = texture(road_tex, ruv + vec2(0.0, eps.y)).r;
			float rzm = texture(road_tex, ruv - vec2(0.0, eps.y)).r;
			float sym_x = abs(rxp - rxm);
			float sym_z = abs(rzp - rzm);
			float lap_x = max(0.0, 2.0 * r_raw - rxp - rxm);
			float lap_z = max(0.0, 2.0 * r_raw - rzp - rzm);
			float ridge_x = (1.0 - smoothstep(0.0, 0.11, sym_x)) * smoothstep(0.06, 0.30, lap_x);
			float ridge_z = (1.0 - smoothstep(0.0, 0.11, sym_z)) * smoothstep(0.06, 0.30, lap_z);
			float dash_z = smoothstep(0.20, 0.38, sin(v_wpos.z * 0.13));
			float dash_x = smoothstep(0.20, 0.38, sin(v_wpos.x * 0.13));
			float dash = max(ridge_x * dash_z, ridge_z * dash_x);
			center_dash = smoothstep(0.88, 0.94, r_raw) * dash * (0.46 + 0.54 * r_noise);
		}

		vec2 rd_uv = v_wpos.xz / 135.0;
		vec3 rd_lin = texture(road_alb, rd_uv).rgb;
		vec3 rd_nrm = texture(road_nrm, rd_uv).rgb;
		vec3 rd_mod = mix(vec3(1.0), rd_lin / 0.26, 0.70);

		vec3 road_pal;
		vec3 shoulder_pal;
		if (theme_id == 2) {
			road_pal = s2l(vec3(0.40, 0.41, 0.43));      // wet ploughed weathered winter tarmac
			shoulder_pal = s2l(vec3(0.54, 0.58, 0.63));
		} else if (theme_id == 1) {
			road_pal = s2l(vec3(0.42, 0.43, 0.43));      // realistic sun-worn grey European asphalt
			shoulder_pal = s2l(vec3(0.42, 0.39, 0.31));
		} else {
			road_pal = s2l(vec3(0.47, 0.44, 0.40));      // sun-bleached dusty desert highway asphalt
			shoulder_pal = s2l(vec3(0.54, 0.48, 0.39));
		}

		vec3 lane_paint = s2l(vec3(0.72, 0.69, 0.58));
		vec3 road_c = road_pal * rd_mod * mix(1.0, 0.78, tire_band * 0.78) * mix(1.0, 1.07, crown_hi * 0.50);
		road_c = mix(road_c, lane_paint, center_dash * 0.52);
		road_c = mix(road_c, alb, edge_dust);
		vec3 sh_c = mix(alb, shoulder_pal * (0.90 + 0.18 * r_noise), 0.68);

		alb = mix(alb, sh_c, r_shoulder * 0.72);
		alb = mix(alb, road_c, r_surface * 0.94);
		alb *= mix(1.0, 0.85, r_curb * 0.72);
		det_nrm = normalize(mix(det_nrm, rd_nrm, r_surface * 0.68));
		rough = mix(rough, mix(0.78, 0.66, tire_band * 0.7), r_surface);
		spec = mix(spec, 0.38, r_surface);
		nrm_d = mix(nrm_d, 0.38, r_surface);
	}

	// Damp darkened riverbanks & wet mud shoreline
	float wet_shore = smoothstep(0.06, 0.56, texture(shore_tex, muv).r);
	alb *= mix(1.0, 0.62, wet_shore);
	rough = mix(rough, 0.38, wet_shore);

	// Dynamic rain / storm wetness + localized flat reflective rain puddles on level ground & roads
	float w_amt = clamp(wetness, 0.0, 1.0);
	float puddle = smoothstep(0.54, 0.74, fbm2(v_wpos.xz * 0.015)) * w_amt * (1.0 - clamp(slope_raw * 8.0, 0.0, 1.0));
	alb *= mix(1.0, 0.70, w_amt);
	alb *= mix(1.0, 0.84, puddle);
	rough = mix(rough, 0.30, w_amt);
	rough = mix(rough, 0.10, puddle);
	det_nrm = normalize(mix(det_nrm, vec3(0.5, 0.5, 1.0), puddle * 0.86));

	ALBEDO = clamp(alb, vec3(0.0), vec3(1.0));
	ROUGHNESS = rough;
	METALLIC = 0.0;
	SPECULAR = mix(spec, 0.82, max(max(wet_shore * 0.58, w_amt * 0.68), puddle));
	NORMAL_MAP = det_nrm;
	NORMAL_MAP_DEPTH = nrm_d;
}
