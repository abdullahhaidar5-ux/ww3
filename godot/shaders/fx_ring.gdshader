// Lane P4c: ground rings - explosion shock rings and ability pings (src/05-fx3d.js RINGS, src/06-view.js pings).
// origin = centre · basis x = (spawn time, life, inner ratio) · basis y = (start radius, end radius, mode: 0 shock (eased, fades ^2) / 1 ping (linear))
// COLOR = colour + opacity.
shader_type spatial;
render_mode unshaded, blend_mix, cull_disabled, shadows_disabled, depth_draw_never, skip_vertex_transform, fog_disabled;
uniform float fx_time = 0.0;
varying vec4 vc;
varying float vin;
void vertex() {
	vec3 c = MODEL_MATRIX[3].xyz, A = MODEL_MATRIX[0].xyz, B = MODEL_MATRIX[1].xyz;
	float k = (fx_time - A.x) / max(A.y, 1e-4);
	float kk = clamp(k, 0.0, 1.0);
	float e = B.z < 0.5 ? 1.0 - pow(1.0 - kk, 3.0) : kk;
	float r = mix(B.x, B.y, e);
	float op = B.z < 0.5 ? (1.0 - kk) * (1.0 - kk) : 1.0 - kk;
	if (k < 0.0 || k >= 1.0) r = 0.0;
	VERTEX = (VIEW_MATRIX * vec4(c + vec3(VERTEX.x, 0.0, VERTEX.y) * 2.0 * r, 1.0)).xyz;
	vc = vec4(COLOR.rgb, COLOR.a * op);
	vin = A.z;
}
void fragment() {
	float r = length(UV - 0.5) * 2.0;
	float a = smoothstep(vin - 0.02, vin + 0.02, r) * smoothstep(1.0, 0.97, r);
	ALBEDO = pow(vc.rgb, vec3(2.2));
	ALPHA = vc.a * a;
}
