// Lane P4c: the supply-line overlay on the ground (key L): coloured ribbons along the roads; UV.x = distance along
// the line (world units), UV2.x = 1 for a cut line (drawn dashed).
shader_type spatial;
render_mode unshaded, blend_mix, cull_disabled, shadows_disabled, depth_draw_never, fog_disabled;
uniform float opacity = 0.85;
void fragment() {
	float dash = UV2.x > 0.5 ? step(0.5, fract(UV.x / 36.0)) : 1.0;
	float edge = smoothstep(0.0, 0.25, UV.y) * smoothstep(1.0, 0.75, UV.y);
	ALBEDO = pow(COLOR.rgb, vec3(2.2));
	ALPHA = COLOR.a * opacity * dash * edge;
}
