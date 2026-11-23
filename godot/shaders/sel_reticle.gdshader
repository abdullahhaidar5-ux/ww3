// $75 AAA Tactical Ground Reticle Shader (razor-crisp anti-aliased military command ring + 4 corner brackets)
shader_type spatial;
render_mode unshaded, blend_mix, cull_disabled, shadows_disabled, depth_draw_never;

void fragment() {
	vec2 q = UV * 2.0 - 1.0;
	float r = length(q);
	if (r > 1.01) {
		discard;
	}
	// Razor-sharp anti-aliased outer tactical ring
	float ring = smoothstep(0.905, 0.930, r) * (1.0 - smoothstep(0.958, 0.982, r));
	// 4 crisp tactical corner brackets at 45/135/225/315 deg
	float diag = abs(abs(q.x) - abs(q.y));
	float brk_ang = 1.0 - smoothstep(0.14, 0.24, diag);
	float brk_rad = smoothstep(0.84, 0.875, r) * (1.0 - smoothstep(0.97, 1.00, r));
	float brackets = brk_ang * brk_rad;
	// Ultra-subtle inner tactical edge sheen (never fuzzy neon spill!)
	float aura = smoothstep(0.76, 0.93, r) * (1.0 - smoothstep(0.93, 0.98, r)) * 0.09;
	float pulse = 0.92 + 0.08 * sin(TIME * 3.5);

	float mask = clamp(ring * 0.68 + brackets * 0.95 + aura, 0.0, 1.0);
	if (mask < 0.01) {
		discard;
	}
	vec3 col = COLOR.rgb * mix(0.95, 1.25, brackets) * pulse;
	ALBEDO = col;
	ALPHA = mask * COLOR.a;
}
