// $75 AAA CoH3 / Broken Arrow Multi-Layer PBR Terrain Shader (WebGL2 Compatibility safe, physically calibrated linear space).
// NOTE: `source_color` textures are ALREADY linear in Godot 4! Vertex COLOR and sRGB palette literals are converted
// once via srgb_to_linear() so nothing is ever double-gamma-darkened or oversaturated.
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
uniform float nrm_strength = 0.75;
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

	// Geological macro & meso variation (zero visible repetition across giant maps)
	float macro_n = fbm2(v_wpos.xz * 0.0017);
	float meso_n = fbm2(v_wpos.xz * 0.0065 + vec2(4.2, -3.1));
	float detail_blend = smoothstep(0.20, 0.80, macro_n);

	// Tri-scale rotated UVs so tiling is completely invisible
	vec2 uv_fine = v_wpos.xz / 110.0;
	vec2 uv_med = v_wpos.xz / 280.0 + vec2(0.23, 0.17);
	vec2 uv_far = vec2(v_wpos.x * 0.866 - v_wpos.z * 0.5, v_wpos.x * 0.5 + v_wpos.z * 0.866) / 720.0 + vec2(0.41, 0.63);

	// Already linear because biome_alb is source_color!
	vec3 b_fine = texture(biome_alb, uv_fine).rgb;
	vec3 b_med = texture(biome_alb, uv_med).rgb;
	vec3 b_far = texture(biome_alb, uv_far).rgb;
	vec3 base_lin = mix(mix(b_med, b_far, detail_blend * 0.52), b_fine, 0.44);

	vec3 n_fine = texture(biome_nrm, uv_fine).rgb;
	vec3 n_med = texture(biome_nrm, uv_med).rgb;
	vec3 n_far = texture(biome_nrm, uv_far).rgb;
	vec3 det_nrm = normalize(mix(mix(n_med, n_far, detail_blend * 0.42), n_fine, 0.46));

	// Baked concavity/valley AO stored in vertex COLOR.a
	float cavity_ao = clamp(COLOR.a, 0.76, 1.10);
	vec3 v_lin = s2l(COLOR.rgb);

	vec3 alb; // LINEAR reflectance (0.04..0.85 realistic PBR range)
	float rough = 0.92;
	float nrm_d = nrm_strength;

	if (theme_id == 0) {
		// Desert (CoH3 North Africa / Levant): rich sun-baked sandstone, warm ochre hardpack & dry arid scrub soil
		vec3 sand_hi = s2l(vec3(0.67, 0.59, 0.46));
		vec3 hardpack = s2l(vec3(0.55, 0.47, 0.36));
		vec3 scrub_earth = s2l(vec3(0.45, 0.39, 0.29));
		vec3 macro_c = mix(hardpack, sand_hi, smoothstep(0.22, 0.80, macro_n));
		macro_c = mix(macro_c, scrub_earth, smoothstep(0.58, 0.86, meso_n) * 0.48);
		vec3 tex_mod = mix(vec3(1.0), base_lin / 0.40, 0.84);
		alb = mix(v_lin * 0.72, macro_c, 0.68) * tex_mod;
		rough = mix(0.95, 0.86, smoothstep(0.45, 0.84, meso_n));
		nrm_d = nrm_strength * 1.15;
	} else if (theme_id == 1) {
		// Mediterranean / Levant Green (CoH3 Italy / South Lebanon): deep tactical olive meadow, warm golden dry hills & dark forest loam
		vec3 meadow = s2l(vec3(0.30, 0.37, 0.20));
		vec3 dry_hill = s2l(vec3(0.48, 0.43, 0.28));
		vec3 dark_loam = s2l(vec3(0.22, 0.28, 0.16));
		vec3 macro_c = mix(dark_loam, meadow, smoothstep(0.22, 0.76, macro_n));
		macro_c = mix(macro_c, dry_hill, smoothstep(0.50, 0.84, meso_n) * 0.62);
		vec3 tex_mod = mix(vec3(1.0), base_lin / 0.17, 0.80);
		alb = mix(v_lin * 0.65, macro_c, 0.72) * tex_mod;
		rough = mix(0.92, 0.84, smoothstep(0.52, 0.84, meso_n));
		nrm_d = nrm_strength * 1.20;
	} else {
		// Alpine Snow: crisp wind-packed powder with rich slate-blue drift hollows & exposed frozen earth ridges
		vec3 snow_hi = s2l(vec3(0.76, 0.80, 0.86));
		vec3 snow_lo = s2l(vec3(0.56, 0.63, 0.74));
		vec3 frozen_earth = s2l(vec3(0.42, 0.41, 0.39));
		vec3 macro_c = mix(snow_lo, snow_hi, smoothstep(0.20, 0.82, macro_n));
		macro_c = mix(macro_c, frozen_earth, smoothstep(0.64, 0.90, meso_n) * 0.46);
		vec3 tex_mod = mix(vec3(1.0), base_lin / 0.66, 0.72);
		alb = mix(v_lin * 0.80, macro_c, 0.68) * tex_mod;
		rough = mix(0.68, 0.88, smoothstep(0.35, 0.76, meso_n));
		nrm_d = nrm_strength * 0.92;
	}

	alb *= cavity_ao;

	// Steep cliff faces & rocky mountain skirts: real stratified rock PBR texture in linear space
	vec3 wn = normalize(v_wnrm);
	float slope_raw = 1.0 - clamp(wn.y, 0.0, 1.0);
	float slope = smoothstep(0.06, 0.25, slope_raw + (meso_n - 0.5) * 0.045);
	if (slope > 0.002) {
		vec2 rock_uv = vec2((v_wpos.x + v_wpos.z) / 220.0, v_wpos.y / 90.0 + macro_n * 0.30);
		vec2 rock_uv2 = v_wpos.xz / 190.0;
		vec3 r_lin = mix(texture(rock_alb, rock_uv).rgb, texture(rock_alb, rock_uv2).rgb, 0.35);
		vec3 r_nrm = normalize(mix(texture(rock_nrm, rock_uv).rgb, texture(rock_nrm, rock_uv2).rgb, 0.35));

		vec3 rock_pal;
		if (theme_id == 2) {
			rock_pal = s2l(vec3(0.42, 0.46, 0.52));     // alpine granite
		} else if (theme_id == 1) {
			rock_pal = s2l(vec3(0.54, 0.53, 0.48));     // Mediterranean limestone
		} else {
			rock_pal = s2l(vec3(0.60, 0.50, 0.38));     // desert sandstone cliffs
		}
		vec3 rock_c = rock_pal * mix(vec3(1.0), r_lin / 0.32, 0.85) * cavity_ao;
		alb = mix(alb, rock_c, slope);
		rough = mix(rough, 0.86, slope);
		det_nrm = normalize(mix(det_nrm, r_nrm, slope * 0.85));
		nrm_d = mix(nrm_d, nrm_strength * 1.55, slope);
	}

	// Crisp, realistic sun-bleached military tarmac & compacted gravel roads (calibrated in linear space -> NEVER charcoal black!)
	float r_raw = texture(road_tex, ruv).r;
	if (r_raw > 0.04) {
		float r_noise = vnoise(v_wpos.xz * 0.045) * 0.6 + vnoise(v_wpos.xz * 0.16) * 0.4;
		float r_edge = r_raw + (r_noise - 0.5) * 0.13;
		float r_shoulder = smoothstep(0.18, 0.42, r_edge);
		float r_surface = smoothstep(0.45, 0.62, r_edge);
		float rut = smoothstep(0.54, 0.66, r_raw) * (1.0 - smoothstep(0.76, 0.90, r_raw));
		float edge_dust = (1.0 - smoothstep(0.55, 0.86, r_raw)) * smoothstep(0.32, 0.80, meso_n) * 0.52;

		vec2 rd_uv = v_wpos.xz / 140.0;
		vec3 rd_lin = texture(road_alb, rd_uv).rgb;
		vec3 rd_nrm = texture(road_nrm, rd_uv).rgb;
		vec3 rd_mod = mix(vec3(1.0), rd_lin / 0.32, 0.72);

		vec3 road_pal;
		vec3 shoulder_pal;
		if (theme_id == 2) {
			// Ploughed winter military road: wet gravel-slush with dirty packed snowbank shoulders
			road_pal = s2l(vec3(0.46, 0.45, 0.43));
			shoulder_pal = s2l(vec3(0.60, 0.63, 0.68));
		} else if (theme_id == 1) {
			// Sun-weathered European/Levant slate asphalt with compacted dirt-gravel verge
			road_pal = s2l(vec3(0.38, 0.37, 0.35));
			shoulder_pal = s2l(vec3(0.40, 0.37, 0.28));
		} else {
			// Sun-bleached North Africa / Levant dusty grey-tan tarmac (crisp contrast against sandstone, never charcoal!)
			road_pal = s2l(vec3(0.47, 0.44, 0.39));
			shoulder_pal = s2l(vec3(0.59, 0.51, 0.40));
		}

		vec3 road_c = road_pal * rd_mod * mix(1.0, 0.86, rut * 0.70);
		road_c = mix(road_c, alb, edge_dust);
		vec3 sh_c = mix(alb, shoulder_pal * (0.92 + 0.16 * r_noise), 0.55);

		alb = mix(alb, sh_c, r_shoulder * 0.62);
		alb = mix(alb, road_c, r_surface * 0.88);
		det_nrm = normalize(mix(det_nrm, rd_nrm, r_surface * 0.70));
		rough = mix(rough, 0.82, r_surface);
		nrm_d = mix(nrm_d, nrm_strength * 0.58, r_surface);
	}

	// Damp darkened riverbanks & coastal sediment transition
	float wet_shore = smoothstep(0.06, 0.58, texture(shore_tex, muv).r);
	alb *= mix(1.0, 0.66, wet_shore);
	rough = mix(rough, 0.42, wet_shore);

	// Dynamic rain / storm wetness
	float w_amt = clamp(wetness, 0.0, 1.0);
	alb *= mix(1.0, 0.72, w_amt);
	rough = mix(rough, 0.34, w_amt);

	ALBEDO = clamp(alb, vec3(0.0), vec3(1.0));
	ROUGHNESS = rough;
	METALLIC = 0.0;
	SPECULAR = mix(0.24, 0.56, max(wet_shore * 0.65, w_amt));
	NORMAL_MAP = det_nrm;
	NORMAL_MAP_DEPTH = nrm_d;
}
