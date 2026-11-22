// Lane P4c: the browser game's particle (src/05-fx3d.js part()) as a stateless GPU particle. Every instance is written
// ONCE when it spawns; its flight, growth, colour and fade are computed here from the spawn time, so thousands of
// particles cost the CPU nothing per frame. Instance layout (MultiMesh transform rows, see look_fx.gd part()):
//   origin = spawn position · basis x = velocity · basis y = (spawn time, life, radius) · basis z = (growth, rise | floor, drag k)
//   COLOR = start colour + alpha · CUSTOM = end colour + flags (1 gravity, 2 bounce, 4 has end colour, 16.. seed)
uniform float fx_time = 0.0;
uniform float px_k = 0.0009;           // 2 tan(fov / 2) / viewport height: world size of one pixel at depth 1
uniform sampler2D noise_tex : filter_linear_mipmap, repeat_disable;
uniform vec3 amb = vec3(1.0);
varying vec4 vcol;
varying vec3 vrc;                      // cos, sin of the sprite's turn, noise cell
void vertex() {
	vec3 p0 = MODEL_MATRIX[3].xyz, v0 = MODEL_MATRIX[0].xyz, A = MODEL_MATRIX[1].xyz, B = MODEL_MATRIX[2].xyz;
	float t = fx_time - A.x, d = A.y, k = t / max(d, 1e-4);
	float fl = INSTANCE_CUSTOM.a;
	float seed = floor(fl / 16.0);
	float lo = fl - seed * 16.0;
	bool grav = mod(lo, 2.0) >= 1.0, c2on = mod(floor(lo / 4.0), 2.0) >= 1.0;
	float kd = max(B.z, 1e-3), e = (1.0 - exp(-kd * t)) / kd;
	vec3 p = p0 + v0 * e;
	if (grav) {
		float a = -420.0 / kd;
		p.y = max(B.y, p0.y + (v0.y - a) * e + a * t);
	} else p.y += B.y * t;
#ifndef FX_ADD
	p.x += 6.0 * t;
#endif
	float s = max(0.4, A.z + B.x * t);
	float al = COLOR.a;
#ifdef FX_ADD
	al *= (1.0 - k) * (1.0 - k);
#else
	al *= (1.0 - k) * min(1.0, k * 5.0 + 0.3);
#endif
	vec3 c = COLOR.rgb;
	if (c2on) c = mix(c, INSTANCE_CUSTOM.rgb, clamp(k / 0.3, 0.0, 1.0));
	vec3 vp = (VIEW_MATRIX * vec4(p, 1.0)).xyz;
	s = min(s, 110.0 * -vp.z * px_k);
	if (k < 0.0 || k >= 1.0 || d <= 0.0) s = 0.0;
	VERTEX = vp + vec3(VERTEX.xy * 2.0 * s, 0.0);
	vcol = vec4(c, al);
	float an = fract(seed * 0.618034) * 6.2831853;
	vrc = vec3(cos(an), sin(an), mod(seed, 4.0));
}
void fragment() {
	vec2 q = UV - 0.5;
	float r = length(q) * 2.0;
	vec2 uv = clamp(vec2(q.x * vrc.x - q.y * vrc.y, q.x * vrc.y + q.y * vrc.x) + 0.5, 0.004, 0.996);
	vec2 cell = vec2(mod(vrc.z, 2.0), floor(vrc.z * 0.5)) * 0.5;
	float s = texture(noise_tex, cell + uv * 0.5).r;
	float a = vcol.a * smoothstep(0.08, 0.62, s) * smoothstep(1.0, 0.2, r + (s - 0.5) * 0.5);
#ifdef FX_ADD
	vec3 c = vcol.rgb * (1.05 + s * 0.9);
	ALBEDO = pow(c, vec3(2.2)) * a;
#else
	vec3 c = vcol.rgb * (0.62 + s * 0.55) * 1.5 * amb;
	ALBEDO = pow(c, vec3(2.2));
	ALPHA = a;
#endif
}
