#!/usr/bin/env bash
# Online check after the exports (run by .github/workflows/godot-build.yml):
#  1. no engine trig/pow left in the sim (they differ between Web and desktop builds: godot/net/det_math.gd)
#  2. the Web export and the Linux export print the same float-probe lines for the deterministic functions
#  3. one Battle through the local relay: Web export (headless Chromium) + Linux export + 2 AI seats, 4 game-minutes,
#     the whole-state hash equal on every game-second (BATTLESOAK PASS)
set -u
cd "$(dirname "$0")/../.."
mkdir -p godot-build
fail=0
python3 godot/net/tools/det_trig.py --check || fail=1
cd server-godot
[ -d node_modules/ws ] || npm ci --no-audit --no-fund > /dev/null 2>&1 || npm install --no-audit --no-fund > /dev/null 2>&1
if ! node -e "require('playwright')" 2>/dev/null && [ ! -d /opt/node-tools/node_modules/playwright ]; then
  npm install --no-save --no-audit --no-fund playwright > /dev/null 2>&1 && npx playwright install --with-deps chromium > /dev/null 2>&1
fi
BIN=../godot-build/linux/WorldWar3.x86_64
timeout 900 node test/battle_soak.mjs --web 1 --native 1 --native-bin $BIN --ai US,IL --map bm_fourmills --minutes ${SOAK_MINUTES:-4} --turnms 25 --fast --digest \
  --report ../godot-build/online-local.json 2>&1 | tee ../godot-build/online-local.log | grep -vE '^\{' | tail -15
grep -q "BATTLESOAK PASS" ../godot-build/online-local.log || fail=1
[ $fail -eq 0 ] && echo "GODOT ONLINE PASS" || echo "GODOT ONLINE FAIL"
exit $fail
