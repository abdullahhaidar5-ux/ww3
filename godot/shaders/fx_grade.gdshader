// Lane P4c: the display-space half of the browser game's final pass (src/10-post.js mFinal): sharpen, saturation,
// cool shadows / warm highlights, contrast, vignette, grain, explosion flash. Exposure, ACES and bloom are the
// Environment's job (they need the HDR picture); this runs once over the finished 3D picture, under the HUD.
shader_type canvas_item;
uniform sampler2D scr : hint_screen_texture, filter_linear;
uniform vec3 mul = vec3(1.0);        // gr * tg (weather grade x theatre grade)
uniform float sat = 1.0;             // sat * tsat
uniform float sharpen = 1.2;
uniform float vig = 1.6;
uniform float grain = 0.012;
uniform float contrast = 1.1;
uniform vec3 lk_s = vec3(0.94, 0.97, 1.05);
uniform vec3 lk_h = vec3(1.05, 1.01, 0.92);
uniform float flash = 0.0;
float hh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void fragment() {
	vec2 px = SCREEN_PIXEL_SIZE;
	vec3 c = texture(scr, SCREEN_UV).rgb;
	vec3 n = texture(scr, SCREEN_UV + vec2(px.x, 0.0)).rgb + texture(scr, SCREEN_UV - vec2(px.x, 0.0)).rgb
		+ texture(scr, SCREEN_UV + vec2(0.0, px.y)).rgb + texture(scr, SCREEN_UV - vec2(0.0, px.y)).rgb;
	c = max(c + (c - n * 0.25) * 0.35 * sharpen, vec3(0.0));
	vec3 cl = pow(c, vec3(2.2)) * mul;
	float l = dot(cl, vec3(0.299, 0.587, 0.114));
	cl = mix(vec3(l), cl, 0.78 * sat);
	cl = mix(cl * vec3(0.95, 0.98, 1.04), cl, smoothstep(0.05, 0.45, l));
	cl = mix(cl, cl * vec3(1.02, 1.0, 0.95), 0.6);
	c = pow(clamp(cl, 0.0, 1.0), vec3(1.0 / 2.2));
	c += vec3(0.015, 0.010, 0.004) * (1.0 - l) + vec3(0.02, 0.012, -0.008) * l;
	vec2 q = SCREEN_UV - 0.5;
	c *= 1.0 - dot(q, q) * 0.32 * vig;
	float lk = dot(c, vec3(0.299, 0.587, 0.114));
	c = (c - 0.5) * contrast + 0.5;
	c *= mix(lk_s, lk_h, smoothstep(0.1, 0.8, lk));
	c += (hh(SCREEN_UV / px + TIME * 61.0) - 0.5) * (0.006 + grain);
	c = mix(c, vec3(1.0, 0.925, 0.82), clamp(flash * 0.45, 0.0, 1.0));
	COLOR = vec4(c, 1.0);
}
