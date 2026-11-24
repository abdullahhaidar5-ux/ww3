shader_type spatial;
render_mode cull_disabled, diffuse_burley, specular_schlick_ggx;

uniform sampler2D flag_tex : source_color, filter_linear_mipmap, repeat_disable;

varying float v_wave;

void vertex() {
	float k = clamp(UV.x, 0.0, 1.0);
	vec3 inst_pos = MODEL_MATRIX[3].xyz;
	float ph = TIME * 5.2 - k * 6.0 + inst_pos.x * 0.037 + inst_pos.z * 0.029;
	float w1 = sin(ph) * 2.2 * k * k;
	float w2 = cos(TIME * 8.4 - k * 10.5 + UV.y * 2.4 + inst_pos.x * 0.02) * 0.68 * k;
	VERTEX.z += w1 + w2;
	VERTEX.y -= 0.72 * k * k;
	v_wave = cos(ph) * k;
}

void fragment() {
	vec3 col = texture(flag_tex, UV).rgb;
	// Natural woven cloth fold shading across the wind ripple crests
	float fold = clamp(0.95 + v_wave * 0.15, 0.76, 1.15);
	ALBEDO = col * fold;
	ROUGHNESS = 0.82;
	METALLIC = 0.02;
}
