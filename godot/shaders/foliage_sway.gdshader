// Grounded Military RTS Foliage Shader (WebGL2 Compatibility safe):
// Trunks locked solidly to earth, gentle upper-crown wind sway, procedural leaf-dapple breakup & deep canopy self-shadowing.
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, diffuse_burley, specular_disabled;

uniform float sway_amp = 0.042;
uniform float sway_speed = 1.45;

varying vec3 v_col_raw;
varying vec3 v_wpos;
varying vec3 v_wnrm;
varying float v_h;

vec3 s2l(vec3 c) {
	vec3 cl = max(c, vec3(0.0));
	return mix(cl / 12.92, pow((cl + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), cl));
}

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

void vertex() {
	vec3 wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	// Lock trunks solidly to ground (zero displacement below y=10, smooth crown sway above)
	float sway_mask = smoothstep(10.0, 26.0, VERTEX.y) * 16.0;
	float phase = TIME * sway_speed + wpos.x * 0.032 + wpos.z * 0.027;
	float gust = sin(phase) * 0.7 + sin(phase * 2.13 + 1.4) * 0.3;
	VERTEX.x += gust * sway_mask * sway_amp;
	VERTEX.z += cos(phase * 0.87) * sway_mask * sway_amp * 0.65;
	v_wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_wnrm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
	v_col_raw = COLOR.rgb;
	v_h = clamp(VERTEX.y / 38.0, 0.0, 1.0);
}

void fragment() {
	vec3 col = v_col_raw;
	if (!OUTPUT_IS_SRGB) {
		col = s2l(col);
	}
	// Procedural leaf-cluster dapple breakup so canopies read as dense foliage rather than flat polygons
	float dapple = vnoise(v_wpos.xz * 0.26 + vec2(v_wpos.y * 0.21, -v_wpos.y * 0.17));
	float micro = vnoise(v_wpos.xz * 0.78 - vec2(v_wpos.y * 0.48));
	float leaf_mod = 0.78 + dapple * 0.28 + micro * 0.14;

	// Deep interior canopy self-shadowing + sunlit crown contrast (Systemic War dense dark-olive tree belts)
	float up_k = clamp(v_wnrm.y * 0.5 + 0.5, 0.0, 1.0);
	float ao = mix(0.56, 1.12, smoothstep(0.08, 0.90, v_h)) * mix(0.74, 1.08, up_k);
	ALBEDO = clamp(col * ao * leaf_mod, vec3(0.0), vec3(1.0));
	ROUGHNESS = clamp(0.84 + (1.0 - dapple) * 0.14, 0.78, 0.98);
	METALLIC = 0.0;
}
