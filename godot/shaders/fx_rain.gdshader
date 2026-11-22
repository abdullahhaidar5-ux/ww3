// Lane P4c: rain streaks (src/05-fx3d.js RAIN: 1400 lines, 14 long, slanted 3, falling 320 per 0.625 s around the view).
// Each instance carries a random (x, phase, z) in its origin; everything else is computed here, nothing per frame on the CPU.
shader_type spatial;
render_mode unshaded, blend_mix, cull_disabled, shadows_disabled, depth_draw_never, skip_vertex_transform;
uniform vec3 centre = vec3(0.0);
uniform float radius = 500.0;
uniform float opacity = 0.35;
void vertex() {
	vec3 d = MODEL_MATRIX[3].xyz;
	float ph = fract(d.y - TIME * 1.6);
	vec3 p = vec3(centre.x + d.x * radius, centre.y + ph * 320.0, centre.z + d.z * radius * 0.7);
	vec3 top = p + vec3(3.0, 14.0, 0.0);
	vec3 a = (VIEW_MATRIX * vec4(p, 1.0)).xyz, b = (VIEW_MATRIX * vec4(top, 1.0)).xyz;
	vec3 mid = mix(a, b, VERTEX.y + 0.5);
	vec2 dir = normalize(b.xy - a.xy + vec2(1e-5));
	float wpx = max(0.35, -mid.z * 0.0011);
	VERTEX = mid + vec3(-dir.y, dir.x, 0.0) * VERTEX.x * 2.0 * wpx;
}
void fragment() { ALBEDO = pow(vec3(0.667, 0.706, 0.745), vec3(2.2)); ALPHA = opacity; }
