// Zero-Copy Cinematic Vignette & Explosion Thermal Flash Overlay (WebGL2 60 FPS safe — ZERO hint_screen_texture backbuffer copy!).
// Colour grading, ACES tonemapping, contrast & saturation run for FREE inside Godot's Environment tonemap pass!
shader_type canvas_item;
render_mode blend_mix;

uniform float vig = 0.24;
uniform float flash = 0.0;

void fragment() {
	vec2 q = SCREEN_UV - 0.5;
	float r2 = dot(q, q);
	float v_alpha = clamp(r2 * 0.62 * vig, 0.0, 0.34);
	float f_alpha = clamp(flash * 0.44, 0.0, 0.72);
	vec3 col = mix(vec3(0.01, 0.015, 0.022), vec3(1.0, 0.93, 0.76), clamp(f_alpha / max(v_alpha + f_alpha, 0.001), 0.0, 1.0));
	float a = clamp(max(v_alpha, f_alpha), 0.0, 0.75);
	COLOR = vec4(col, a);
}
