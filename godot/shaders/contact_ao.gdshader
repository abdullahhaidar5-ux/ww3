// Soft radial ground-contact ambient occlusion shadow disc under buildings, vehicles, and squads (WebGL2 safe).
shader_type spatial;
render_mode unshaded, blend_mix, cull_disabled, shadows_disabled, depth_draw_never;

void fragment() {
	vec2 q = UV * 2.0 - 1.0;
	float r2 = dot(q, q);
	if (r2 > 1.0) {
		discard;
	}
	float falloff = 1.0 - smoothstep(0.08, 1.0, r2);
	float core = 1.0 - smoothstep(0.0, 0.75, r2);
	float alpha = COLOR.a * (falloff * 0.58 + core * 0.42);
	ALBEDO = vec3(0.02, 0.025, 0.035);
	ALPHA = alpha;
}
