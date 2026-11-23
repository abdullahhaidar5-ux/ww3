// Zero Hour / Rise of the Reds style luminous tracers: hot incandescent white-gold core + fiery streak tail.
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
	float fr = min(0.22 + nb * 0.08, (34.0 + nb * 18.0) / L);
	float ng = 1.15 + nb * 0.75;
	float along = VERTEX.y + 0.5;                       // 0 tail, 1 head
	vec3 wp = mix(a, b, clamp(u - fr * (1.0 - along), 0.0, 1.0));
	vec3 va = (VIEW_MATRIX * vec4(a, 1.0)).xyz, vb = (VIEW_MATRIX * vec4(b, 1.0)).xyz;
	vec3 vp = (VIEW_MATRIX * vec4(wp, 1.0)).xyz;
	vec2 dir = normalize(vb.xy / max(-vb.z, 1.0) - va.xy / max(-va.z, 1.0) + vec2(1e-6));
	float wd = max(0.95, -vp.z * px_k * 1.85) * mix(0.55, 1.15, along);
	if (k < 0.0 || k >= 1.0) wd = 0.0;
	VERTEX = vp + vec3(-dir.y, dir.x, 0.0) * VERTEX.x * 2.0 * wd;
	vec3 col_ramp = mix(COLOR.rgb * vec3(0.35, 0.14, 0.05), mix(COLOR.rgb, vec3(1.4, 1.25, 0.95), 0.45), pow(along, 0.65));
	vc = vec4(col_ramp * ng, 1.0 - abs(UV.x - 0.5) * 2.0);
}
void fragment() { ALBEDO = pow(max(vc.rgb, vec3(0.0)), vec3(2.0)) * smoothstep(0.0, 0.55, vc.a); }
