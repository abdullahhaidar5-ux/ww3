// Atmospheric sky dome with directional sun scattering halo and multi-octave drifting clouds.
shader_type sky;
uniform vec3 hor = vec3(0.93, 0.84, 0.68);
uniform vec3 zen = vec3(0.25, 0.48, 0.80);
uniform vec3 sun_dir = vec3(-0.72, 0.55, -0.42);
uniform float gain = 1.5;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void sky() {
	vec3 vd = normalize(EYEDIR);
	float y = max(vd.y, 0.0);
	vec3 c = mix(hor, zen, pow(y, 0.52));
	float sun_dot = max(dot(vd, normalize(sun_dir)), 0.0);
	c += vec3(1.0, 0.88, 0.68) * pow(sun_dot, 8.0) * 0.24 * smoothstep(0.0, 0.25, zen.b + 0.15);
	c += vec3(1.0, 0.96, 0.86) * pow(sun_dot, 96.0) * 0.75 * smoothstep(0.05, 0.3, zen.b + 0.1);
	vec2 uv = vd.xz / (vd.y + 0.18) * 1.6 + vec2(TIME * 0.004, 0.0);
	float cl = n(uv) * 0.5 + n(uv * 2.1) * 0.3 + n(uv * 4.7) * 0.2;
	cl = smoothstep(0.48, 0.78, cl) * smoothstep(0.0, 0.25, y);
	c = mix(c, mix(vec3(0.98, 0.97, 0.94), hor, 0.28) * (0.48 + 0.52 * smoothstep(0.1, 0.45, zen.b)), cl * 0.82);
	c = mix(c, hor * 0.94, smoothstep(0.14, 0.0, y));
	COLOR = pow(max(c, vec3(0.0)), vec3(2.2)) * gain;
}
