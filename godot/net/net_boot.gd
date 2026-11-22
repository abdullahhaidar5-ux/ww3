## Autoload (project.godot [autoload] NetBoot): an invite link opens the game straight in that online lobby.
## Web: https://.../godot-web/?code=abc123   Desktop: WorldWar3.exe -- --join=abc123
extends Node

const BattleNet = preload("res://scripts/battle/battle_net.gd")

func _ready() -> void:
	if OS.get_cmdline_user_args().has("--float-probe"):
		for l in load("res://net/test/float_probe.gd").run(): print(l)
		print("PROBE done")
		return
	var code := BattleNet.web_code()
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--join="): code = a.substr(7).to_lower()
	if code == "": return
	await get_tree().process_frame
	var sc := get_tree().current_scene
	if sc == null or not sc.has_method("go_online"):
		get_tree().change_scene_to_file("res://scenes/battle.tscn")
		for i in 600:
			await get_tree().process_frame
			sc = get_tree().current_scene
			if sc != null and sc.has_method("go_online"): break
	if sc != null and sc.has_method("go_online") and sc.get("online") == null:
		sc.go_online(BattleNet.RELAY, code, "Player")
