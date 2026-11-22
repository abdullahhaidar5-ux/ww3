// Lane P4c: scorch marks and craters on the ground (instanced quads laid on the slope; they never fade, like the browser).
shader_type spatial;
render_mode unshaded, blend_mix, cull_disabled, shadows_disabled, depth_draw_never;
uniform sampler2D tex : source_color, filter_linear_mipmap, repeat_disable;
uniform float opacity = 1.0;
uniform vec3 light = vec3(1.0);
void fragment() { vec4 t = texture(tex, UV); ALBEDO = t.rgb * light; ALPHA = t.a * opacity * COLOR.a; }
