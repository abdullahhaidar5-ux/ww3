extends SceneTree
## One-off tool: renders every <KEY>.svg in IN_DIR to res://ui/icons/flags/<KEY>.png at 320x192 (5:3, the game's flag shape).
##   godot --headless --path godot -s res://tools/flag_render.gd -- <in_dir>
const W := 320
const H := 192

func _init() -> void:
	var args := OS.get_cmdline_user_args()
	var src: String = args[0] if args.size() > 0 else ""
	var d := DirAccess.open(src)
	if d == null:
		print("FLAGS no dir ", src); quit(1); return
	var n := 0
	for f in d.get_files():
		if not f.ends_with(".svg"): continue
		var key := f.get_basename()
		var txt := FileAccess.get_file_as_string(src.path_join(f))
		var w0 := _num(txt, "width"); var h0 := _num(txt, "height")
		var vb := _viewbox(txt)
		if (w0 <= 0.0 or h0 <= 0.0) and vb.size() == 4: w0 = vb[2]; h0 = vb[3]
		if w0 <= 0.0: w0 = 900.0
		var sc := maxf(float(W) * 2.0 / w0, float(H) * 2.0 / maxf(h0, 1.0))
		var img := Image.new()
		var err := img.load_svg_from_string(txt, sc)
		if err != OK:
			print("FLAGS fail ", key, " err ", err); continue
		img.convert(Image.FORMAT_RGBA8)
		img.resize(W, H, Image.INTERPOLATE_LANCZOS)
		img.save_png("res://ui/icons/flags/%s.png" % key)
		n += 1
		print("FLAGS ok ", key, " from ", w0, "x", h0)
	print("FLAGS done ", n)
	quit()

func _num(t: String, attr: String) -> float:
	var head := t.substr(t.find("<svg"), 600)
	var re := RegEx.new(); re.compile("\\s" + attr + "=\"([0-9.]+)")
	var m := re.search(head)
	return float(m.get_string(1)) if m else 0.0

func _viewbox(t: String) -> Array:
	var head := t.substr(t.find("<svg"), 600)
	var re := RegEx.new(); re.compile("viewBox=\"([-0-9. ,]+)\"")
	var m := re.search(head)
	if not m: return []
	var out := []
	for s in m.get_string(1).replace(",", " ").split(" ", false): out.append(float(s))
	return out
