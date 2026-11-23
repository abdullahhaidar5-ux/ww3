#!/usr/bin/env bash
# Web export of the Godot edition with the JS-sim bridge: rebuilds godot/web/ww3sim.js from src/, exports the "Web"
# preset (custom shell res://web/shell.html) and puts ww3sim.js next to index.html.
#   tools-godot/export_web.sh [out-dir]        (default godot-build/web; needs Godot 4.4.1 + web export templates)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GODOT="${GODOT:-$(command -v godot || echo /opt/godot/Godot_v4.4.1-stable_linux.x86_64)}"
OUT="${1:-$ROOT/godot-build/web}"
mkdir -p "$OUT"
node "$ROOT/tools-godot/build_bridge.mjs"
"$GODOT" --headless --path "$ROOT/godot" --export-release Web "$OUT/index.html" 2>&1 | grep -v "^$" | tail -${EXPORT_LOG_LINES:-15}
cp "$ROOT/godot/web/ww3sim.js" "$ROOT/godot/web/ww3bridge.js" "$OUT/"
[ -f "$ROOT/godot/web/ww3audio.js" ] && cp "$ROOT/godot/web/ww3audio.js" "$OUT/" || true
[ -f "$ROOT/godot/ui/menu-world.webp" ] && cp "$ROOT/godot/ui/menu-world.webp" "$OUT/" || true
ls -la "$OUT" | tail -12
