// Lane P4c: the browser game's sky dome (src/04-gfx.js SKY): horizon -> zenith gradient + drifting noise clouds.
shader_type sky;
uniform vec3 hor = vec3(0.86, 0.78, 0.64);
uniform vec3 zen = vec3(0.30, 0.50, 0.80);
uniform float gain = 1.6;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void sky() {
	vec3 vd = EYEDIR;
	float y = max(vd.y, 0.0);
	vec3 c = mix(hor, zen, pow(y, 0.55));
	vec2 uv = vd.xz / (vd.y + 0.18) * 1.6 + vec2(TIME * 0.004, 0.0);
	float cl = n(uv) * 0.5 + n(uv * 2.1) * 0.3 + n(uv * 4.7) * 0.2;
	cl = smoothstep(0.5, 0.78, cl) * smoothstep(0.0, 0.25, y);
	c = mix(c, mix(vec3(0.97, 0.96, 0.93), hor, 0.3) * (0.45 + 0.55 * smoothstep(0.1, 0.45, zen.b)), cl * 0.85);
	c = mix(c, hor * 0.92, smoothstep(0.12, 0.0, y));
	COLOR = pow(c, vec3(2.2)) * gain;
}
