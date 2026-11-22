#!/usr/bin/env bash
# ONE-COMMAND CHECK of the Godot edition: the gate every lane passes before ORCH merges it.
#   tools-godot/check.sh            (from anywhere; ~3 min on the sandbox, about half of it the web build in software GL)
#   SKIP_WEB=1 tools-godot/check.sh  quick: everything but the export + Chromium
# Prints one PASS / FAIL line per step with its time, stops at the first FAIL, exit 0 only if all pass.
# Heavy jobs (Godot export, Chromium) queue on /tmp/ww3-heavy.lock so parallel lanes don't starve the 4 cores.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
G="${GODOT:-godot}"
LOCK=/tmp/ww3-heavy.lock
LOGD="$ROOT/godot-build/check"; mkdir -p "$LOGD"
T0=$(date +%s)
step() { # name, pass-regex, command...
  local name="$1" pat="$2"; shift 2
  local log="$LOGD/$name.log" s=$(date +%s)
  "$@" > "$log" 2>&1; local rc=$?
  local dt=$(( $(date +%s) - s ))
  if [ $rc -eq 0 ] && grep -qE "$pat" "$log" && ! grep -qE "SCRIPT ERROR|Parse Error" "$log"; then
    printf "PASS %-26s %4ss\n" "$name" "$dt"
  else
    printf "FAIL %-26s %4ss (exit %s, log %s)\n" "$name" "$dt" "$rc" "${log#$ROOT/}"
    grep -E "SCRIPT ERROR|Parse Error|FAIL|ERROR" "$log" | head -8 | sed 's/^/     /'; tail -4 "$log" | sed 's/^/     /'
    echo "CHECK FAIL after $(( $(date +%s) - T0 ))s"; exit 1
  fi
}
step bridge_test      "BRIDGE PASS"   node tools-godot/bridge_test.mjs
step import           "."             timeout 900 "$G" --headless --path godot --import
step det              "DET PASS"      timeout 300 "$G" --headless --path godot -s res://net/test/det_test.gd
step codec            "CODEC PASS"    timeout 600 "$G" --headless --path godot -s res://net/test/codec_test.gd -- --minutes 3
step audio            "AUDIO TEST PASS" timeout 300 "$G" --headless --path godot res://audio/test_audio.tscn
step battle_gdsim_ai  "^min +3 "      timeout 600 "$G" --headless --path godot res://scenes/battle.tscn -- --battle-ai --gdsim --fac=RS --vs=IL --seed=2 --minutes=3
step bridge_desktop   "WEB build only" bash -c "timeout 120 '$G' --headless --path godot res://scenes/battle.tscn -- --battle-ai --fac=IR --vs=US; true"
if [ "${SKIP_WEB:-0}" != "1" ]; then
  step export_web     "index.wasm"    flock "$LOCK" tools-godot/export_web.sh
  step web            "PASS battle runs" flock "$LOCK" node tools-godot/check_web.mjs --secs "${SECS:-60}" --limit "${LIMIT:-900}"
  grep -E "^(PASS|FAIL)" "$LOGD/web.log" | sed 's/^/     /'
fi
echo "CHECK PASS in $(( $(date +%s) - T0 ))s"
