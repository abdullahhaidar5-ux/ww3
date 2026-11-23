shader_type spatial;
render_mode cull_disabled, diffuse_burley, specular_schlick_ggx;

uniform sampler2D flag_tex : source_color, filter_linear_mipmap, repeat_disable;

varying float v_wave;

void vertex() {
	float k = clamp(UV.x, 0.0, 1.0);
	float ph = TIME * 5.2 - k * 6.0 + NODE_POSITION_WORLD.x * 0.03 + NODE_POSITION_WORLD.z * 0.03;
	float w1 = sin(ph) * 2.1 * k * k;
	float w2 = cos(TIME * 8.4 - k * 10.5 + UV.y * 2.2) * 0.65 * k;
	VERTEX.z += w1 + w2;
	VERTEX.y -= 0.7 * k * k;
	v_wave = cos(ph) * k;
}

void fragment() {
	vec3 col = texture(flag_tex, UV).rgb;
	// Subtle fabric fold lighting across the ripple crests
	float fold = clamp(0.92 + v_wave * 0.14, 0.74, 1.12);
	ALBEDO = col * fold;
	ROUGHNESS = 0.78;
	METALLIC = 0.02;
}
