#!/usr/bin/env bash
# Headless tests of the Godot edition (run by .github/workflows/godot-build.yml; locally: GODOT=/path/to/godot bash server-godot/test/ci-tests.sh)
# Every line it prints ends in PASS or FAIL; exit code 1 if anything failed.
set -u
cd "$(dirname "$0")/../.."
G="${GODOT:-godot}"
mkdir -p godot-build
fail=0
run() { # name, pass-pattern, command...
  local name="$1" pat="$2"; shift 2
  local log="godot-build/test-$name.log"
  timeout 900 "$@" > "$log" 2>&1; local rc=$?
  if [ $rc -eq 0 ] && grep -qE "$pat" "$log" && ! grep -qE "SCRIPT ERROR|Parse Error" "$log"; then echo "$name PASS"
  else echo "$name FAIL (exit $rc)"; grep -E "SCRIPT ERROR|Parse Error|FAIL|ERROR" "$log" | head -8; tail -5 "$log"; fail=1; fi
}
run det "DET PASS" "$G" --headless --path godot -s res://net/test/det_test.gd
run battle_test "^min +3 " "$G" --headless --path godot -s res://sim/tests/battle_test.gd -- --facs IR,US --minutes 3 --seed 1
run codec "CODEC PASS" "$G" --headless --path godot -s res://net/test/codec_test.gd -- --minutes 3
run battle_ai "BATTLE-AI|BATTLE start" "$G" --headless --path godot res://scenes/battle.tscn -- --battle-ai --fac=RS --vs=IL --seed=2 --minutes=4
# every self-test the port lanes add: a script named *selftest*.gd (extends SceneTree, prints "... PASS", exit 0)
for f in $(cd godot && find . -name '*selftest*.gd' | sed 's|^\./||' | sort); do
  run "selftest-$(basename "$f" .gd)" "PASS" "$G" --headless --path godot -s "res://$f"
done
# ... and the main scene's own --selftest, once main.gd has one
if grep -q -- '--selftest' godot/scripts/main.gd 2>/dev/null; then
  run selftest "PASS" "$G" --headless --path godot -- --selftest
fi
[ $fail -eq 0 ] && echo "GODOT TESTS PASS" || echo "GODOT TESTS FAIL"
exit $fail
