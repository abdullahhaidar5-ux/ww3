#!/usr/bin/env bash
# Runs a Godot headless script against godot/sim + godot/data without touching godot/project.godot (owned by the
# ww3 GODOT helper): builds a throwaway project next to them and links the two folders in.
#   tools-godot/run_headless.sh res://sim/tests/battle_test.gd -- --facs IR,US --minutes 10
# GODOT=/path/to/godot (default: godot on PATH, else /opt/godot/Godot_v4.4.1-stable_linux.x86_64)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GODOT="${GODOT:-$(command -v godot || echo /opt/godot/Godot_v4.4.1-stable_linux.x86_64)}"
P="${GODOT_SIM_PROJ:-/tmp/ww3-godot-sim-proj}"
mkdir -p "$P"
[ -e "$P/sim" ] || ln -s "$ROOT/godot/sim" "$P/sim"
[ -e "$P/data" ] || ln -s "$ROOT/godot/data" "$P/data"
[ -f "$P/project.godot" ] || printf 'config_version=5\n\n[application]\nconfig/name="ww3-sim-headless"\n' > "$P/project.godot"
SCRIPT="$1"; shift
exec "$GODOT" --headless --path "$P" -s "$SCRIPT" "$@"
