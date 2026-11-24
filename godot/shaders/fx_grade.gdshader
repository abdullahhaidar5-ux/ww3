// Cinematic Military RTS final colour pass: clean halo-free micro-sharpening, fast linear balance,
// cool-slate shadow / warm-sunlit highlight split-tone, gentle shadow lift, peripheral vignette, and blast flash.
shader_type canvas_item;
uniform sampler2D scr : hint_screen_texture, filter_linear;
uniform vec3 mul = vec3(1.0);        // gr * tg (weather grade x theatre grade)
uniform float sat = 1.0;             // sat * tsat
uniform float sharpen = 0.32;
uniform float vig = 0.28;
uniform float grain = 0.002;
uniform float contrast = 1.10;
uniform vec3 lk_s = vec3(0.89, 0.95, 1.07);
uniform vec3 lk_h = vec3(1.05, 1.01, 0.94);
uniform float flash = 0.0;

float hh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void fragment() {
	vec2 px = SCREEN_PIXEL_SIZE;
	vec3 c = texture(scr, SCREEN_UV).rgb;
	// Clean tightly-clamped unsharp mask: crisp barrel/silhouette clarity with ZERO bright halo ringing
	vec3 n = texture(scr, SCREEN_UV + vec2(px.x, 0.0)).rgb + texture(scr, SCREEN_UV - vec2(px.x, 0.0)).rgb
		+ texture(scr, SCREEN_UV + vec2(0.0, px.y)).rgb + texture(scr, SCREEN_UV - vec2(0.0, px.y)).rgb;
	vec3 detail = clamp((c - n * 0.25) * 0.40 * sharpen, vec3(-0.055), vec3(0.055));
	c = clamp(c + detail, vec3(0.0), vec3(1.0));

	// Fast WebGL2-friendly approximate linear-space colour balance & saturation (zero pow() overhead)
	vec3 cl = (c * c) * mul;
	float l = dot(cl, vec3(0.299, 0.587, 0.114));
	cl = mix(vec3(l), cl, 0.96 * sat);
	// Subtle cool-navy shadow lift so deep tactical shadows stay legible
	cl += vec3(0.004, 0.006, 0.010) * (1.0 - smoothstep(0.0, 0.20, l));
	c = sqrt(clamp(cl, vec3(0.0), vec3(1.0)));

	// Single clean contrast curve + cool-slate shadow / warm-sunlit highlight split-tone
	float lk = dot(c, vec3(0.299, 0.587, 0.114));
	c = clamp((c - 0.48) * contrast + 0.48, vec3(0.0), vec3(1.0));
	c *= mix(lk_s, lk_h, smoothstep(0.14, 0.78, lk));

	// Gentle peripheral vignette (keeps tactical battlefield bright and readable)
	vec2 q = SCREEN_UV - 0.5;
	c *= 1.0 - dot(q, q) * 0.40 * vig;

	// Ultra-fine film texture + fiery golden-white thermal blast flash
	c += (hh(SCREEN_UV / px + TIME * 43.0) - 0.5) * grain;
	c = mix(c, vec3(1.0, 0.92, 0.76), clamp(flash * 0.46, 0.0, 1.0));
	COLOR = vec4(clamp(c, 0.0, 1.0), 1.0);
}
