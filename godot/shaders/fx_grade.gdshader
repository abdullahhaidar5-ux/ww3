// CoH3-inspired sunlit filmic final pass: subtle micro-sharpening, balanced saturation, airy cool shadows & warm
// golden highlights, gentle shadow lift (never crushed pitch black), light vignette, and explosion flash.
shader_type canvas_item;
uniform sampler2D scr : hint_screen_texture, filter_linear;
uniform vec3 mul = vec3(1.0);        // gr * tg (weather grade x theatre grade)
uniform float sat = 1.0;             // sat * tsat
uniform float sharpen = 0.55;
uniform float vig = 0.36;
uniform float grain = 0.005;
uniform float contrast = 1.04;
uniform vec3 lk_s = vec3(0.93, 0.97, 1.05);
uniform vec3 lk_h = vec3(1.03, 1.01, 0.95);
uniform float flash = 0.0;

float hh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void fragment() {
	vec2 px = SCREEN_PIXEL_SIZE;
	vec3 c = texture(scr, SCREEN_UV).rgb;
	// Subtle clarity unsharp mask clamped to avoid halos around bright edges
	vec3 n = texture(scr, SCREEN_UV + vec2(px.x, 0.0)).rgb + texture(scr, SCREEN_UV - vec2(px.x, 0.0)).rgb
		+ texture(scr, SCREEN_UV + vec2(0.0, px.y)).rgb + texture(scr, SCREEN_UV - vec2(0.0, px.y)).rgb;
	vec3 detail = clamp((c - n * 0.25) * 0.28 * sharpen, vec3(-0.08), vec3(0.08));
	c = clamp(c + detail, vec3(0.0), vec3(1.0));

	// Linear-space color balance & saturation
	vec3 cl = pow(c, vec3(2.2)) * mul;
	float l = dot(cl, vec3(0.299, 0.587, 0.114));
	cl = mix(vec3(l), cl, 0.96 * sat);
	// Soft shadow lift (prevents pitch-black shadow voids, keeps CoH3 sunlit readability)
	cl += vec3(0.006, 0.007, 0.010) * (1.0 - smoothstep(0.0, 0.22, l));
	c = pow(clamp(cl, 0.0, 1.0), vec3(1.0 / 2.2));

	// Single clean contrast pass + split-tone (cool slate shadows, warm sunlit highlights)
	float lk = dot(c, vec3(0.299, 0.587, 0.114));
	c = clamp((c - 0.48) * contrast + 0.48, vec3(0.0), vec3(1.0));
	c *= mix(lk_s, lk_h, smoothstep(0.12, 0.78, lk));

	// Gentle peripheral vignette (keeps top/bottom battle view bright and readable)
	vec2 q = SCREEN_UV - 0.5;
	c *= 1.0 - dot(q, q) * 0.42 * vig;

	// Ultra-fine film texture + big blast flash
	c += (hh(SCREEN_UV / px + TIME * 43.0) - 0.5) * grain;
	c = mix(c, vec3(1.0, 0.94, 0.84), clamp(flash * 0.42, 0.0, 1.0));
	COLOR = vec4(clamp(c, 0.0, 1.0), 1.0);
}
