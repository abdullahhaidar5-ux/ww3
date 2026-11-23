// Lightweight GPU vertex wind-sway foliage shader for WebGL2 Compatibility (linear-space PBR foliage tones!)
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_disabled, diffuse_burley, specular_disabled;

uniform float sway_amp = 0.042;
uniform float sway_speed = 1.45;

varying vec3 v_col;
varying float v_h;

vec3 s2l(vec3 c) {
	vec3 cl = max(c, vec3(0.0));
	return mix(cl / 12.92, pow((cl + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), cl));
}

void vertex() {
	vec3 wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float h = max(0.0, VERTEX.y - 5.0);
	float phase = TIME * sway_speed + wpos.x * 0.032 + wpos.z * 0.027;
	float gust = sin(phase) * 0.7 + sin(phase * 2.13 + 1.4) * 0.3;
	VERTEX.x += gust * h * sway_amp;
	VERTEX.z += cos(phase * 0.87) * h * sway_amp * 0.65;
	v_col = s2l(COLOR.rgb);
	v_h = clamp(VERTEX.y / 38.0, 0.0, 1.0);
}

void fragment() {
	// Vertical canopy self-shadowing AO (rich sunlit foliage crowns + deep legible shaded boughs)
	float ao = mix(0.95, 1.52, v_h);
	ALBEDO = clamp(v_col * ao, vec3(0.0), vec3(1.0));
	ROUGHNESS = 0.94;
	METALLIC = 0.0;
}
