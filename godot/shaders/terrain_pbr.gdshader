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
		// Desert (CoH3 North Africa / Levant): calm photographic sandstone-taupe, dusty hardpack & dry arid gravel wadis
		vec3 sand_hi = s2l(vec3(0.64, 0.58, 0.49));
		vec3 hardpack = s2l(vec3(0.53, 0.47, 0.39));
		vec3 scrub_earth = s2l(vec3(0.42, 0.37, 0.30));
		vec3 macro_c = mix(hardpack, sand_hi, smoothstep(0.20, 0.80, macro_n));
		macro_c = mix(macro_c, scrub_earth, smoothstep(0.52, 0.84, meso_n) * 0.52);
		float wadi = smoothstep(0.60, 0.76, wadi_n) * (1.0 - smoothstep(0.76, 0.92, wadi_n));
		macro_c = mix(macro_c, scrub_earth * 0.86, wadi * 0.44);
		vec3 tex_mod = mix(vec3(1.0), base_lin / 0.34, 0.62);
		alb = mix(v_lin * 0.68, macro_c, 0.78) * tex_mod;
		rough = mix(0.96, 0.88, smoothstep(0.42, 0.82, meso_n));
		nrm_d = 0.42;
	} else if (theme_id == 1) {
		// Mediterranean / European Green (CoH3 Italy / Zero Hour Enhanced): realistic muted olive-sage field, parched straw hills & dark earth
		vec3 meadow = s2l(vec3(0.31, 0.36, 0.22));
		vec3 dry_hill = s2l(vec3(0.46, 0.42, 0.29));
		vec3 dark_loam = s2l(vec3(0.22, 0.26, 0.16));
		vec3 mud_earth = s2l(vec3(0.31, 0.27, 0.20));
		vec3 macro_c = mix(dark_loam, meadow, smoothstep(0.20, 0.78, macro_n));
		macro_c = mix(macro_c, dry_hill, smoothstep(0.46, 0.82, meso_n) * 0.58);
		macro_c = mix(macro_c, mud_earth, smoothstep(0.62, 0.88, wadi_n) * 0.48);
		vec3 tex_mod = mix(vec3(1.0), base_lin / 0.14, 0.58);
		alb = mix(v_lin * 0.58, macro_c, 0.80) * tex_mod;
		rough = mix(0.94, 0.85, smoothstep(0.50, 0.84, meso_n));
		nrm_d = 0.46;
	} else {
		// Alpine Snow: crisp wind-carved powder, cold slate-blue drift hollows & exposed frozen permafrost ridges
		vec3 snow_hi = s2l(vec3(0.75, 0.80, 0.87));
		vec3 snow_lo = s2l(vec3(0.52, 0.60, 0.72));
		vec3 frozen_earth = s2l(vec3(0.34, 0.33, 0.32));
		vec3 macro_c = mix(snow_lo, snow_hi, smoothstep(0.18, 0.82, macro_n));
		macro_c = mix(macro_c, frozen_earth, smoothstep(0.62, 0.88, meso_n) * 0.50);
		vec3 tex_mod = mix(vec3(1.0), base_lin / 0.60, 0.68);
		alb = mix(v_lin * 0.78, macro_c, 0.74) * tex_mod;
		rough = mix(0.66, 0.88, smoothstep(0.32, 0.74, meso_n));
		nrm_d = 0.44;
	}

	alb *= cavity_ao;

	// Steep cliff faces & rocky scree/talus skirts around mountain bases
	vec3 wn = normalize(v_wnrm);
	float slope_raw = 1.0 - clamp(wn.y, 0.0, 1.0);
	float scree = smoothstep(0.035, 0.11, slope_raw + (meso_n - 0.5) * 0.03) * 0.42;
	float slope = smoothstep(0.06, 0.23, slope_raw + (meso_n - 0.5) * 0.04);
	float rock_blend = clamp(max(slope, scree * smoothstep(0.35, 0.75, meso_n)), 0.0, 1.0);
	if (rock_blend > 0.002) {
		vec2 rock_uv = vec2((v_wpos.x + v_wpos.z) / 210.0, v_wpos.y / 84.0 + macro_n * 0.30);
		vec2 rock_uv2 = v_wpos.xz / 180.0;
		vec3 r_lin = mix(texture(rock_alb, rock_uv).rgb, texture(rock_alb, rock_uv2).rgb, 0.36);
		vec3 r_nrm = normalize(mix(texture(rock_nrm, rock_uv).rgb, texture(rock_nrm, rock_uv2).rgb, 0.36));

		vec3 rock_pal;
		if (theme_id == 2) {
			rock_pal = s2l(vec3(0.36, 0.40, 0.46));     // dark alpine granite
		} else if (theme_id == 1) {
			rock_pal = s2l(vec3(0.45, 0.44, 0.40));     // Mediterranean limestone
		} else {
			rock_pal = s2l(vec3(0.50, 0.43, 0.34));     // canyon sandstone cliffs
		}
		vec3 rock_c = rock_pal * mix(vec3(1.0), r_lin / 0.25, 0.82) * cavity_ao;
		alb = mix(alb, rock_c, rock_blend);
		rough = mix(rough, 0.86, rock_blend);
		det_nrm = normalize(mix(det_nrm, r_nrm, rock_blend * 0.85));
		nrm_d = mix(nrm_d, 1.25, rock_blend);
	}

	// CRISP AAA MILITARY HIGHWAYS: clean weathered asphalt tarmac, gravel shoulders, twin armor tire ruts & natural wear (NO polka-dot artifacts!)
	float r_raw = texture(road_tex, ruv).r;
	if (r_raw > 0.04) {
		float r_noise = vnoise(v_wpos.xz * 0.048) * 0.62 + vnoise(v_wpos.xz * 0.16) * 0.38;
		float r_edge = r_raw + (r_noise - 0.5) * 0.085;
		float r_shoulder = smoothstep(0.16, 0.40, r_edge);
		float r_surface = smoothstep(0.46, 0.58, r_edge);
		float r_curb = smoothstep(0.42, 0.50, r_raw) * (1.0 - smoothstep(0.50, 0.60, r_raw));
		// Subtle twin armored-column tire wear tracks along both lanes + lighter crown along center
		float tire_band = smoothstep(0.58, 0.70, r_raw) * (1.0 - smoothstep(0.76, 0.88, r_raw));
		float crown_hi = smoothstep(0.86, 0.96, r_raw) * (0.45 + 0.55 * r_noise);
		float edge_dust = (1.0 - smoothstep(0.56, 0.84, r_raw)) * smoothstep(0.32, 0.82, meso_n) * 0.46;

		vec2 rd_uv = v_wpos.xz / 135.0;
		vec3 rd_lin = texture(road_alb, rd_uv).rgb;
		vec3 rd_nrm = texture(road_nrm, rd_uv).rgb;
		vec3 rd_mod = mix(vec3(1.0), rd_lin / 0.26, 0.68);

		vec3 road_pal;
		vec3 shoulder_pal;
		if (theme_id == 2) {
			road_pal = s2l(vec3(0.36, 0.37, 0.38));      // wet ploughed winter tarmac
			shoulder_pal = s2l(vec3(0.54, 0.57, 0.62));
		} else if (theme_id == 1) {
			road_pal = s2l(vec3(0.33, 0.34, 0.34));      // weathered slate European/Levant asphalt
			shoulder_pal = s2l(vec3(0.38, 0.35, 0.27));
		} else {
			road_pal = s2l(vec3(0.39, 0.37, 0.34));      // sun-worn dusty desert highway tarmac
			shoulder_pal = s2l(vec3(0.51, 0.45, 0.36));
		}

		vec3 road_c = road_pal * rd_mod * mix(1.0, 0.84, tire_band * 0.70) * mix(1.0, 1.07, crown_hi * 0.55);
		road_c = mix(road_c, alb, edge_dust);
		vec3 sh_c = mix(alb, shoulder_pal * (0.92 + 0.16 * r_noise), 0.64);

		alb = mix(alb, sh_c, r_shoulder * 0.68);
		alb = mix(alb, road_c, r_surface * 0.93);
		alb *= mix(1.0, 0.87, r_curb * 0.70);
		det_nrm = normalize(mix(det_nrm, rd_nrm, r_surface * 0.65));
		rough = mix(rough, 0.76, r_surface);
		spec = mix(spec, 0.36, r_surface);
		nrm_d = mix(nrm_d, 0.36, r_surface);
	}

	// Damp darkened riverbanks & wet mud shoreline
	float wet_shore = smoothstep(0.06, 0.56, texture(shore_tex, muv).r);
	alb *= mix(1.0, 0.62, wet_shore);
	rough = mix(rough, 0.38, wet_shore);

	// Dynamic rain / storm wetness
	float w_amt = clamp(wetness, 0.0, 1.0);
	alb *= mix(1.0, 0.68, w_amt);
	rough = mix(rough, 0.30, w_amt);

	ALBEDO = clamp(alb, vec3(0.0), vec3(1.0));
	ROUGHNESS = rough;
	METALLIC = 0.0;
	SPECULAR = mix(spec, 0.58, max(wet_shore * 0.65, w_amt));
	NORMAL_MAP = det_nrm;
	NORMAL_MAP_DEPTH = nrm_d;
}
