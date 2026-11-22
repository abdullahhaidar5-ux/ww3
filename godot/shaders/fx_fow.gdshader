// Lane P4c (WebGL2-safe blend_mix): fog of war as a clean translucent dark shroud pass over the depth buffer
// (R: 1 = visible now -> alpha 0, 0.5 = explored -> alpha 0.36, 0 = unexplored -> alpha 0.58).
shader_type spatial;
render_mode unshaded, blend_mix, depth_test_disabled, cull_disabled, shadows_disabled, fog_disabled;
uniform sampler2D depth_tex : hint_depth_texture, filter_nearest, repeat_disable;
uniform sampler2D fog_tex : filter_linear, repeat_disable;
uniform vec2 map_size = vec2(4800.0, 3320.0);
uniform vec2 texel = vec2(0.008, 0.012);
uniform float seen_k = 0.64;     // brightness of ground seen before
uniform float dark_k = 0.42;     // never seen
void vertex() { POSITION = vec4(VERTEX.xy * 2.0, 0.0, 1.0); }
void fragment() {
	float d = texture(depth_tex, SCREEN_UV).r;
	if (d >= 0.9999 || d <= 0.00001) {
		discard;
	}
	vec4 w = INV_VIEW_MATRIX * INV_PROJECTION_MATRIX * vec4(SCREEN_UV * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
	vec2 uv = clamp(w.xz / max(abs(w.w), 0.0001) / map_size, vec2(0.0), vec2(1.0));
	float f = texture(fog_tex, uv).r * 0.4 + (texture(fog_tex, uv + texel).r + texture(fog_tex, uv - texel).r
		+ texture(fog_tex, uv + texel * vec2(1.0, -1.0)).r + texture(fog_tex, uv + texel * vec2(-1.0, 1.0)).r) * 0.15;
	float k = mix(dark_k, seen_k, smoothstep(0.0, 0.5, f));
	k = mix(k, 1.0, smoothstep(0.5, 0.95, f));
	ALBEDO = vec3(0.02, 0.03, 0.05);
	ALPHA = clamp(1.0 - k, 0.0, 0.62);
}
