// Hyper-Realistic Military PBR Shader for all 22 nations' Buildings, Tanks, Vehicles, Aircraft, Civilian Houses & Soldiers.
// WebGL2 Compatibility-safe, single-pass, zero extra draw calls, 100% tangent-attribute independent:
// uses MODEL_MATRIX world-unit planar projection + Gram-Schmidt view-space normal perturbation so EVERY GLB
// (textured OR vertex-colored, with OR without tangents) gets crisp rolled-steel armor, architectural concrete,
// rain streaks, lower-hull dust, and gleaming reflective glass with zero texture swimming or black-normal bugs.
shader_type spatial;
render_mode diffuse_burley, specular_schlick_ggx;

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
uniform int mat_mode = 0; // 0 = vehicle/tank/aircraft, 1 = building/fortification/civ, 2 = soldier/infantry
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

	vec3 an = abs(normalize(v_obj_nrm));
	// Dominant planar projection (1 texture tap -> locked 60 FPS on WebGL2 + Mobile!)
	vec2 tri_uv = (an.y > an.x && an.y > an.z) ? v_obj_pos.xz : ((an.x > an.z) ? v_obj_pos.zy : v_obj_pos.xy);
	float detail_freq = (mat_mode == 1) ? 0.068 : ((mat_mode == 2) ? 0.24 : 0.115);
	vec3 dn = texture(detail_nrm, tri_uv * detail_freq).rgb;
	vec3 combined_n = has_src_nrm ? mix(texture(src_nrm, uv).rgb, dn, 0.42) : dn;

	// Physical world-scale macro & micro weathering (locked rigidly to vehicle/building axes — zero swimming!)
	float w_macro = vnoise(tri_uv * (mat_mode == 1 ? 0.11 : 0.22));
	float w_fine = vnoise(tri_uv * (mat_mode == 1 ? 0.55 : 0.95));
	float wear = w_macro * 0.65 + w_fine * 0.35;

	float luma = dot(alb, vec3(0.299, 0.587, 0.114));
	float rough = base_roughness;
	float metal = base_metallic;
	float ao = 1.0;

	if (mat_mode == 1) {
		// ---- BUILDINGS, FORTIFICATIONS, BASE PADS & CIVILIAN STRUCTURES ----
		bool is_glass = (base_roughness < 0.36) || (alb.b > alb.r * 1.18 && luma < 0.30);
		if (is_glass) {
			// Armored reflective architectural glass panes with crisp sky Fresnel sheen
			alb *= 0.58;
			rough = 0.08 + w_fine * 0.05;
			metal = 0.22;
			float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 2.8);
			alb += vec3(0.16, 0.23, 0.32) * fres;
		} else {
			// Anti-plastic white calibration: tone clipped bright white blocks into rich sunlit concrete
			if (luma > 0.56) {
				float excess = smoothstep(0.56, 0.92, luma);
				alb *= mix(1.0, 0.78, excess);
			}
			// Cast-concrete panel seams & vertical rain-runoff streaks on vertical walls
			float seam_x = smoothstep(0.95, 0.995, abs(sin(tri_uv.x * 0.26)));
			float seam_y = smoothstep(0.95, 0.995, abs(sin(tri_uv.y * 0.34)));
			float seam = max(seam_x, seam_y) * (1.0 - an.y * 0.75);
			float rain_streak = vnoise(vec2(tri_uv.x * 0.40, tri_uv.y * 0.07));
			alb *= (0.91 + wear * 0.16) * (1.0 - seam * 0.13);
			alb *= mix(0.90, 1.02, rain_streak);
			// Gritty rooftop weathering vs architectural wall plaster/concrete
			if (an.y > 0.68) {
				alb *= 0.91 + w_fine * 0.13;
				rough = clamp(rough + 0.10 + (wear - 0.5) * 0.18, 0.56, 0.95);
			} else {
				rough = clamp(rough + (wear - 0.5) * 0.20, 0.46, 0.94);
			}
			// True world-height ground dust splash & foundation contact AO (bottom ~7.5 world units)
			float dirt = 1.0 - smoothstep(0.0, 8.5, v_rel_y);
			alb = mix(alb, alb * vec3(0.80, 0.75, 0.66), dirt * 0.40);
			ao = mix(0.72, 1.0, smoothstep(0.0, 7.0, v_rel_y));
			metal = clamp(metal, 0.02, 0.24);
			float bump_s = has_src_nrm ? 0.68 : (has_albedo_tex ? 0.36 : 0.58);
			NORMAL = apply_micro_normal(NORMAL, v_view_tu, combined_n, bump_s);
		}
	} else if (mat_mode == 2) {
		// ---- INFANTRY / SOLDIERS: combat fabric weave, boot dust & crisp uniform contrast ----
		if (luma > 0.48) {
			alb *= mix(1.0, 0.76, smoothstep(0.48, 0.90, luma));
		}
		alb *= 0.93 + w_fine * 0.14;
		float boot_dust = 1.0 - smoothstep(0.0, 3.8, v_rel_y);
		alb = mix(alb, alb * vec3(0.78, 0.72, 0.62), boot_dust * 0.36);
		ao = mix(0.80, 1.0, smoothstep(0.0, 3.5, v_rel_y));
		rough = clamp(0.82 + (w_fine - 0.5) * 0.14, 0.68, 0.95);
		metal = min(metal, 0.12);
		if (has_src_nrm) {
			NORMAL = apply_micro_normal(NORMAL, v_view_tu, texture(src_nrm, uv).rgb, 0.55);
		}
	} else {
		// ---- TANKS, ARMORED VEHICLES, DOZERS & AIRCRAFT: CARC military paint, RHA micro-steel & edge sheen ----
		bool is_cockpit = (base_roughness < 0.34) || (alb.b > alb.r * 1.25 && luma < 0.24);
		if (is_cockpit) {
			alb *= 0.62;
			rough = 0.08 + w_fine * 0.04;
			metal = 0.22;
			float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 2.8);
			alb += vec3(0.18, 0.25, 0.34) * fres;
		} else {
			if (luma > 0.62) {
				alb *= mix(1.0, 0.82, smoothstep(0.62, 0.96, luma));
			}
			// Rolled steel plate weathering + subtle welded armor panel lines
			float panel = smoothstep(0.94, 0.995, abs(sin(tri_uv.x * 0.48)) * abs(sin(tri_uv.y * 0.48)));
			alb *= (0.94 + wear * 0.14) * (1.0 - panel * 0.12);
			// True world-height lower-track/tire dust & subtle undercarriage AO (bottom ~4.5 world units only!)
			float low_dust = 1.0 - smoothstep(0.0, 5.0, v_rel_y);
			alb = mix(alb, mix(alb * 0.88, vec3(0.45, 0.40, 0.30), 0.26), low_dust * 0.45);
			ao = mix(0.76, 1.0, smoothstep(0.0, 4.5, v_rel_y));
			// Upward bevel & grazing Fresnel worn-steel highlight (gives turrets, ERA & barrels crisp metallic punch!)
			float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 3.0);
			float edge_wear = clamp(an.y * 0.42 + fres * 0.80, 0.0, 1.0) * smoothstep(0.32, 0.84, wear);
			alb += (alb * 0.18 + vec3(0.03)) * edge_wear;
			// Authentic CARC satin/matte armor paint: keeps olive/tan/camo rich while glinting cleanly on steel bevels
			rough = clamp(mix(clamp(base_roughness, 0.46, 0.78), 0.34, edge_wear * 0.55) + low_dust * 0.16 + (wear - 0.5) * 0.18, 0.30, 0.90);
			metal = clamp(min(base_metallic, 0.18) + edge_wear * 0.16 - low_dust * 0.08, 0.04, 0.34);
			float bump_s = has_src_nrm ? 0.72 : (has_albedo_tex ? 0.38 : 0.56);
			NORMAL = apply_micro_normal(NORMAL, v_view_tu, combined_n, bump_s);
		}
	}

	ALBEDO = alb;
	ROUGHNESS = rough;
	METALLIC = metal;
	SPECULAR = (mat_mode == 1) ? 0.48 : ((mat_mode == 2) ? 0.30 : 0.58);
	AO = ao;
	if (emission_energy > 0.001) {
		EMISSION = emission_col * emission_energy;
	}
}
