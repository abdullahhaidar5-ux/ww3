# Phone battle loading — fix (branch `orch/phone-load`)

**What was hanging:** in Safari's engine on an iPhone 13 the battle sat on "Preparing graphics" for about 40 s (that's the
test machine, which has no real graphics chip). That step built every 3D model twice, plus burnt copies, and prepared
all their shaders in one giant frame. Safari on a real iPhone either stalls on a frame like that or drops the
graphics completely. The old code then never drew again, so the battle seemed stuck.

**Fix:**
- Phones now prepare only the models for this battle, one team version, a few at a time, with progress on screen. On
  the test iPhone, "Preparing graphics" went from 40 s to 3 s and the whole load from 48 s to 8 s.
- Every loading step has a 20 s watchdog. If a step isn't done by then, loading moves on.
- If the browser drops the graphics, the game starts them again by itself at low quality and keeps the battle going.
  If that fails, a "Try again with low graphics" button appears.
- Desktop looks the same as before.

**Test:** new `orch/phoneload.mjs` (in the gate's touch job) runs WebKit as an iPhone 13. It loaded 3 maps, one of them
4-player, plus a battle that lost its graphics on purpose, and all reached a running battle.

**CIGATE PASS** (17/17) on 961c78b.
