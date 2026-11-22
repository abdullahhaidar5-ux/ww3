#!/usr/bin/env bash
# Lane P4c: run the desktop viewer (godot/scenes/p4c_view.tscn) off-screen and save a picture.
#   tools-godot/p4c_view.sh out.png [viewer args: --dump=.. --cam=x,y,dist --tod=dusk --weather=rain --fxtest --frames=90 ...]
OUT="$1"; shift
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
timeout 600 xvfb-run -a -s "-screen 0 ${RES:-1280x720}x24" "${GODOT:-godot}" --rendering-driver opengl3 --resolution ${RES:-1280x720} --path "$ROOT/godot" res://scenes/p4c_view.tscn -- --shot="$OUT" "$@" 2>&1 \
  | grep -E "P4C VIEW|SCRIPT ERROR|ERROR:|at: .*gd|shader" | sort | uniq -c | sort -rn | head -${LINES_MAX:-14}
