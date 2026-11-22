// Lane P4c: tracer streaks (src/05-fx3d.js TRACERS): the head runs from muzzle to target in 0.072 s, a short bright
// streak behind it. origin = start · basis x = end · basis y = (spawn time, life, night level) · COLOR = colour.
shader_type spatial;
render_mode unshaded, blend_add, cull_disabled, shadows_disabled, depth_draw_never, skip_vertex_transform, fog_disabled;
uniform float fx_time = 0.0;
uniform float px_k = 0.0009;
varying vec4 vc;
void vertex() {
	vec3 a = MODEL_MATRIX[3].xyz, b = MODEL_MATRIX[0].xyz, A = MODEL_MATRIX[1].xyz;
	float t = fx_time - A.x, k = t / max(A.y, 1e-4), nb = A.z;
	float L = max(1.0, distance(a, b));
	float u = min(1.0, k * 1.25);
	float fr = min(0.14 + nb * 0.07, (20.0 + nb * 14.0) / L);
	float ng = 1.0 + nb * 0.7;
	float along = VERTEX.y + 0.5;                       // 0 tail, 1 head
	vec3 wp = mix(a, b, clamp(u - fr * (1.0 - along), 0.0, 1.0));
	vec3 va = (VIEW_MATRIX * vec4(a, 1.0)).xyz, vb = (VIEW_MATRIX * vec4(b, 1.0)).xyz;
	vec3 vp = (VIEW_MATRIX * vec4(wp, 1.0)).xyz;
	vec2 dir = normalize(vb.xy / max(-vb.z, 1.0) - va.xy / max(-va.z, 1.0) + vec2(1e-6));
	float wd = max(0.5, -vp.z * px_k * 1.1);
	if (k < 0.0 || k >= 1.0) wd = 0.0;
	VERTEX = vp + vec3(-dir.y, dir.x, 0.0) * VERTEX.x * 2.0 * wd;
	vc = vec4(COLOR.rgb * mix(vec3(0.1), vec3(0.95, 0.72, 0.72), along) * ng, 1.0 - abs(UV.x - 0.5) * 2.0);
}
void fragment() { ALBEDO = pow(vc.rgb, vec3(2.2)) * smoothstep(0.0, 0.6, vc.a); }
