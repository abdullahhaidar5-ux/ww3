// Hyper-Realistic Military PBR Shader (Double-Sided variant) for all 22 nations' Buildings, Tanks, Vehicles, Aircraft & Soldiers.
// Identical to military_pbr.gdshader with cull_disabled so double-sided GLB armor/fuselage/building meshes receive full PBR shading.
shader_type spatial;
render_mode cull_disabled, diffuse_burley, specular_schlick_ggx;

uniform vec4 albedo_col : source_color = vec4(1.0);
uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform bool has_albedo_tex = false;
uniform vec2 uv_scale = vec2(1.0);
uniform vec2 uv_offset = vec2(0.0);
uniform bool use_vertex_color = false;

uniform sampler2D src_nrm : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform bool has_src_nrm = false;
uniform sampler2D detail_nrm : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;

uniform float base_roughness = 0.72;
uniform float base_metallic = 0.10;
uniform int mat_mode = 0; // 0 = vehicle/tank, 1 = building/fortification/civ, 2 = soldier/infantry, 3 = aircraft
uniform float dust_enable = 1.0;
uniform vec3 emission_col : source_color = vec3(0.0);
uniform float emission_energy = 0.0;
uniform float model_h = 18.0;

varying vec3 v_obj_pos;   // World-unit coordinates locked rigidly to each instance's local axes
varying vec3 v_obj_nrm;
varying float v_rel_y;    // True world-unit height above instance ground pivot
varying vec3 v_view_tu;   // Object-locked planar tangent U in view space (tangent-attribute independent!)

vec3 s2l(vec3 c) {
	return pow(max(c, vec3(0.0)), vec3(2.2));
}

float hash21(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	float a = hash21(i);
	float b = hash21(i + vec2(1.0, 0.0));
	float c = hash21(i + vec2(0.0, 1.0));
	float d = hash21(i + vec2(1.0, 1.0));
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 apply_micro_normal(vec3 n_view, vec3 tu_hint, vec3 n_rgb, float strength) {
	vec3 tu = tu_hint - n_view * dot(tu_hint, n_view);
	float tul = length(tu);
	if (tul > 0.001) {
		tu /= tul;
	} else {
		vec3 ref = abs(n_view.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
		tu = normalize(cross(ref, n_view));
	}
	vec3 tv = cross(n_view, tu);
	vec2 xy = (n_rgb.xy * 2.0 - 1.0) * strength;
	return normalize(n_view + tu * xy.x + tv * xy.y);
}

void vertex() {
	vec3 inst_origin = MODEL_MATRIX[3].xyz;
	vec3 w_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	vec3 rel_w = w_pos - inst_origin;
	vec3 sx = MODEL_MATRIX[0].xyz;
	vec3 sy = MODEL_MATRIX[1].xyz;
	vec3 sz = MODEL_MATRIX[2].xyz;
	float lx = max(length(sx), 0.0001);
	float ly = max(length(sy), 0.0001);
	float lz = max(length(sz), 0.0001);
	vec3 ax = sx / lx;
	vec3 ay = sy / ly;
	vec3 az = sz / lz;
	// True world-unit local coordinates (immune to GLB internal scale!)
	v_obj_pos = vec3(dot(rel_w, ax), dot(rel_w, ay), dot(rel_w, az));
	v_obj_nrm = normalize(NORMAL);
	v_rel_y = max(0.0, rel_w.y);
	// Pick dominant object-locked planar tangent axis and transform into view space
	vec3 an_v = abs(v_obj_nrm);
	vec3 w_tu = (an_v.y > an_v.x && an_v.y > an_v.z) ? ax : ((an_v.x > an_v.z) ? az : ax);
	v_view_tu = normalize((VIEW_MATRIX * vec4(w_tu, 0.0)).xyz);
}

void fragment() {
	vec2 uv = UV * uv_scale + uv_offset;
	vec3 alb = albedo_col.rgb;
	if (use_vertex_color) {
		vec3 vc = COLOR.rgb;
		if (!OUTPUT_IS_SRGB) {
			vc = s2l(vc);
		}
		alb *= vc;
	}
	if (has_albedo_tex) {
		alb *= texture(albedo_tex, uv).rgb;
	}

	vec3 obj_n = normalize(v_obj_nrm);
	vec3 an = abs(obj_n);
	float up_fac = clamp((FRONT_FACING ? 1.0 : -1.0) * obj_n.y, 0.0, 1.0);
	// Dominant planar projection (1 texture tap -> locked 60 FPS on WebGL2 + Mobile!)
	vec2 tri_uv = (an.y > an.x && an.y > an.z) ? v_obj_pos.xz : ((an.x > an.z) ? v_obj_pos.zy : v_obj_pos.xy);
	float detail_freq = (mat_mode == 1) ? 0.072 : ((mat_mode == 2) ? 0.28 : ((mat_mode == 3) ? 0.14 : 0.125));
	vec3 dn = texture(detail_nrm, tri_uv * detail_freq).rgb;
	vec3 combined_n = has_src_nrm ? mix(texture(src_nrm, uv).rgb, dn, 0.44) : dn;

	// Physical world-scale macro & micro weathering (locked rigidly to vehicle/building axes — zero swimming!)
	float w_macro = vnoise(tri_uv * (mat_mode == 1 ? 0.11 : (mat_mode == 3 ? 0.16 : 0.22)));
	float w_fine = vnoise(tri_uv * (mat_mode == 1 ? 0.58 : (mat_mode == 3 ? 0.85 : 1.05)));
	float wear = w_macro * 0.62 + w_fine * 0.38;

	float luma = dot(alb, vec3(0.299, 0.587, 0.114));
	float rough = base_roughness;
	float metal = base_metallic;
	float ao = 1.0;

	if (mat_mode == 1) {
		// ---- BUILDINGS, FORTIFICATIONS, BASE PADS & CIVILIAN STRUCTURES ----
		bool is_glass = (base_roughness < 0.36) || (alb.b > alb.r * 1.18 && luma < 0.30);
		if (is_glass) {
			// Crisp dark reflective tinted architectural glass panes (no cartoon bright blue)
			alb = mix(alb * 0.42, vec3(0.03, 0.048, 0.068), 0.46);
			rough = 0.07 + w_fine * 0.05;
			metal = 0.28;
			float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 3.0);
			alb += vec3(0.11, 0.14, 0.18) * fres;
		} else {
			// Anti-plastic white calibration: tone clipped bright white blocks into weathered concrete/stucco
			if (luma > 0.50) {
				float excess = smoothstep(0.50, 0.90, luma);
				alb *= mix(1.0, 0.74, excess);
			}
			// Sharp cast-concrete panel seams & architectural vertical rain-runoff weathering
			float seam_x = smoothstep(0.955, 0.996, abs(sin(tri_uv.x * 0.28)));
			float seam_y = smoothstep(0.955, 0.996, abs(sin(tri_uv.y * 0.36)));
			float seam = max(seam_x, seam_y) * (1.0 - an.y * 0.80);
			float rain_streak = vnoise(vec2(tri_uv.x * 0.42, tri_uv.y * 0.065));
			float damp_stain = vnoise(vec2(tri_uv.x * 0.15, tri_uv.y * 0.04));
			alb *= (0.89 + wear * 0.18) * (1.0 - seam * 0.18);
			alb *= mix(0.87, 1.03, rain_streak * 0.65 + damp_stain * 0.35);
			// Gritty rooftop gravel/tar/AC weathering vs architectural concrete/stucco walls
			if (up_fac > 0.68) {
				float gravel = vnoise(tri_uv * 1.45);
				alb *= 0.86 + gravel * 0.16 + w_macro * 0.06;
				rough = clamp(rough + 0.12 + (wear - 0.5) * 0.20, 0.62, 0.96);
			} else {
				rough = clamp(rough + (wear - 0.5) * 0.22 + seam * 0.08, 0.50, 0.95);
			}
			// Ground dust splash & strong foundation contact AO (0.65 -> 1.0 over 0..8.5u)
			float dirt = (1.0 - smoothstep(0.0, 8.5, v_rel_y)) * dust_enable;
			alb = mix(alb, alb * vec3(0.76, 0.71, 0.62), dirt * 0.44);
			ao = mix(0.65, 1.0, smoothstep(0.0, 8.5, v_rel_y));
			metal = clamp(metal, 0.02, 0.24);
			float bump_s = has_src_nrm ? 0.72 : (has_albedo_tex ? 0.40 : 0.62);
			NORMAL = apply_micro_normal(NORMAL, v_view_tu, combined_n, bump_s);
		}
	} else if (mat_mode == 2) {
		// ---- INFANTRY / SOLDIERS: tactical fabric weave, kevlar/gear contrast & boot dust ----
		if (luma > 0.44) {
			alb *= mix(1.0, 0.74, smoothstep(0.44, 0.88, luma));
		}
		// Enhance helmet, tactical vest & rifle contrast against uniform fatigues
		float gear_dark = 1.0 - smoothstep(0.08, 0.28, luma);
		alb *= mix(0.92 + w_fine * 0.16, 0.84 + w_fine * 0.12, gear_dark * 0.45);
		float boot_dust = (1.0 - smoothstep(0.0, 3.8, v_rel_y)) * dust_enable;
		alb = mix(alb, alb * vec3(0.76, 0.70, 0.60), boot_dust * 0.38);
		ao = mix(0.74, 1.0, smoothstep(0.0, 4.0, v_rel_y));
		float fres_s = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 3.4);
		float vest_sheen = up_fac * 0.35 + fres_s * 0.45;
		rough = clamp(0.84 - vest_sheen * 0.14 + (w_fine - 0.5) * 0.14, 0.60, 0.95);
		metal = clamp(min(metal, 0.12) + gear_dark * 0.08, 0.02, 0.18);
		// ALWAYS apply micro-normal relief so every infantry squad gets crisp fabric/kevlar/gear detail
		NORMAL = apply_micro_normal(NORMAL, v_view_tu, combined_n, has_src_nrm ? 0.58 : 0.40);
	} else if (mat_mode == 3) {
		// ---- AIRCRAFT (JETS, HELIS, AIRLIFTS, DRONES): riveted aerospace skin, stealth RAM & glossy canopy ----
		bool is_cockpit = (base_roughness < 0.34) || (alb.b > alb.r * 1.22 && luma < 0.26);
		if (is_cockpit) {
			alb = mix(alb * 0.45, vec3(0.04, 0.055, 0.075), 0.42);
			rough = 0.06 + w_fine * 0.04;
			metal = 0.34;
			float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 2.6);
			alb += vec3(0.18, 0.20, 0.22) * fres;
		} else {
			if (luma > 0.56) {
				alb *= mix(1.0, 0.80, smoothstep(0.56, 0.94, luma));
			}
			// Crisp riveted aerospace aluminum / radar-absorbent stealth matte panel seams
			float p_x = smoothstep(0.955, 0.996, abs(sin(tri_uv.x * 0.58)));
			float p_y = smoothstep(0.955, 0.996, abs(sin(tri_uv.y * 0.58)));
			float panel_seam = max(p_x, p_y);
			float rivet = smoothstep(0.92, 0.99, abs(sin(tri_uv.x * 3.2)) * abs(sin(tri_uv.y * 3.2))) * panel_seam;
			// Airflow oil & exhaust soot streaking along fuselage (ZERO brown ground mud!)
			float streak = vnoise(vec2(v_obj_pos.x * 0.08, (v_obj_pos.y + v_obj_pos.z) * 0.42));
			float soot = smoothstep(0.42, 0.85, streak) * (1.0 - up_fac * 0.35);
			alb *= (0.94 + wear * 0.12) * (1.0 - panel_seam * 0.14 - rivet * 0.08);
			alb = mix(alb, alb * vec3(0.76, 0.75, 0.73), soot * 0.28);
			// Crisp specular edge highlight on leading edges, intakes & dorsal spine
			float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 2.8);
			float edge_hi = clamp(up_fac * 0.45 + fres * 0.85, 0.0, 1.0) * smoothstep(0.28, 0.82, wear);
			alb += (alb * 0.16 + vec3(0.025)) * edge_hi;
			rough = clamp(mix(clamp(base_roughness, 0.42, 0.68), 0.26, edge_hi * 0.55) + soot * 0.12 + (wear - 0.5) * 0.14, 0.24, 0.78);
			metal = clamp(max(base_metallic, 0.14) + edge_hi * 0.22 - soot * 0.08, 0.10, 0.44);
			ao = mix(0.86, 1.0, smoothstep(0.0, 3.5, v_rel_y));
			float bump_s = has_src_nrm ? 0.66 : (has_albedo_tex ? 0.34 : 0.50);
			NORMAL = apply_micro_normal(NORMAL, v_view_tu, combined_n, bump_s);
		}
	} else {
		// ---- TANKS, ARMORED VEHICLES & DOZERS: authentic CARC matte paint, welded RHA steel & edge sheen ----
		bool is_cockpit = (base_roughness < 0.34) || (alb.b > alb.r * 1.25 && luma < 0.24);
		if (is_cockpit) {
			alb = mix(alb * 0.45, vec3(0.03, 0.05, 0.07), 0.40);
			rough = 0.07 + w_fine * 0.04;
			metal = 0.28;
			float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 2.8);
			alb += vec3(0.14, 0.19, 0.24) * fres;
		} else {
			if (luma > 0.52) {
				alb *= mix(1.0, 0.78, smoothstep(0.52, 0.92, luma));
			}
			// Welded RHA armor plate seams, rivet lines & subtle exhaust soot/grime variation
			float seam_u = smoothstep(0.955, 0.996, abs(sin(tri_uv.x * 0.46)));
			float seam_v = smoothstep(0.955, 0.996, abs(sin(tri_uv.y * 0.46)));
			float panel = max(seam_u, seam_v);
			float rivet = smoothstep(0.93, 0.992, abs(sin(tri_uv.x * 2.8)) * abs(sin(tri_uv.y * 2.8))) * panel;
			float grime = vnoise(vec2(tri_uv.x * 0.36, tri_uv.y * 0.18));
			alb *= (0.92 + wear * 0.15) * (1.0 - panel * 0.13 - rivet * 0.09);
			alb *= mix(0.90, 1.02, grime);
			// Grounded lower-hull/track dust & undercarriage AO (gated by dust_enable so turrets/barrels stay clean!)
			float low_dust = (1.0 - smoothstep(0.0, 4.8, v_rel_y)) * dust_enable;
			alb = mix(alb, mix(alb * 0.84, vec3(0.42, 0.37, 0.28), 0.30), low_dust * 0.48);
			ao = mix(mix(0.88, 0.72, dust_enable), 1.0, smoothstep(0.0, 4.8, v_rel_y));
			// Tight metallic worn-steel specular edge highlight on upward bevels, hatches, ERA & barrels
			float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 3.1);
			float edge_wear = clamp(up_fac * 0.46 + fres * 0.84, 0.0, 1.0) * smoothstep(0.30, 0.82, wear);
			alb += (alb * 0.16 + vec3(0.028)) * edge_wear;
			// Authentic CARC matte military paint (0.56-0.78) with tight worn-steel bevel highlights
			float carc_r = clamp(base_roughness, 0.56, 0.78);
			rough = clamp(mix(carc_r, 0.30, edge_wear * 0.60) + low_dust * 0.16 + (wear - 0.5) * 0.16, 0.28, 0.92);
			metal = clamp(clamp(base_metallic, 0.08, 0.22) + edge_wear * 0.24 - low_dust * 0.10, 0.04, 0.42);
			float bump_s = has_src_nrm ? 0.74 : (has_albedo_tex ? 0.42 : 0.60);
			NORMAL = apply_micro_normal(NORMAL, v_view_tu, combined_n, bump_s);
		}
	}

	ALBEDO = alb;
	ROUGHNESS = rough;
	METALLIC = metal;
	SPECULAR = (mat_mode == 1) ? 0.46 : ((mat_mode == 2) ? 0.28 : ((mat_mode == 3) ? 0.62 : 0.58));
	AO = ao;
	if (emission_energy > 0.001) {
		EMISSION = emission_col * emission_energy;
	}
}
