# HANDOFF — Godot port, lane P5: audio (branch `orch/gport-p5`, based on `orch/godot-port`)

Goal (Abdullah 2026-11-22): the Godot edition sounds the same as the browser game. Report with numbers:
`orch/reports/gport-p5.md`.

## What exists (all in `godot/audio/`)
- `audio_manager.gd` — autoload **`Audio`** (registered in `godot/project.godot` `[autoload]`). One file, sections in the
  order of the JS: buses (initAudio), settings, files, effects (spatial / sfxShot / sfxBoom / sfxClip), voices (speak /
  voRPlay / voPlay / heroSpeak / duck), radio (radioCall), announcer (annSay), shouts (bfShoutPlay), soundtrack
  (ST / stPlay / stTick / stEnd), the battle observer, engine beds (envAudio), distant fire.
- `audio_tables.json` — the browser game's own tables for the 22 playable nations (VO_MAP, VOR, VOH, VOS, ANN_OFF, VO_ROLE,
  RADGAP, sfx manifest, soundtrack list with authors/licences). **Never edit by hand**: `node godot/audio/tools/gen_tables.mjs`
  rebuilds it from `src/09*.js`, `sfx/manifest.json`, `mus/st/manifest.json` (re-run when voices are re-recorded).
- `test_audio.tscn` / `test_audio.gd` — headless test: `godot --headless --path godot res://audio/test_audio.tscn`
  prints `AUDIO TEST PASS`.
- `tools/web_check.mjs` — opens the exported web build in headless Chromium: silent before the first click, then music
  streams from `mus/st/`, sheets come from `vo/` and `sfx/`. Prints `WEB AUDIO CHECK PASS`.
- `tools/js_capture.mjs` — records 60 s of the BROWSER game's output + its clip log (the reference for the report).

## No sound file is in the .pck
The manager reads `vo/`, `sfx/`, `mus/st/` (the same files the browser game uses) from, in this order:
web build: `?assets=<url>` if given, else the folder **above** the build (`../vo/...`, so a build at `<site>/godot/` uses
the site's folders), else `godot/` under it, else the live site; desktop/editor: the repo folder above `godot/`, the
folder of the executable, `user://audio_cache/`, else the live site over HTTP (cached into `user://audio_cache/`).
**ORCH: when you publish the web build, put it one folder below the site root (or pass `?assets=`)** and ship the
desktop build with `vo/ sfx/ mus/st/` next to the exe (or let it download on first use).
Web music plays through the browser's own `<audio>` elements (streamed, like the JS game's two decks); desktop music
through two `AudioStreamPlayer`s. Web build size: +0.1 MB (see the report).

## Hooks in `godot/scripts/battle/battle.gd` (11 lines, all marked `# P5 HOOK`)
`Audio.battle_start(sim, me)` after the sim is made · `Audio.observe(sim, me, fast)` once per tick in `sim_tick` ·
`Audio.set_cam(cam_target, cam_dist, cam)` per frame · `Audio.menu()` in `_show_setup` · `Audio.speak(0|1|2, kinds)` on
select (click, box, Ctrl+A) / move / attack and attack-move · `Audio.ann("funds")`, `Audio.ann("cantBuild")` ·
`Audio.add_button(ui)` (the small "Sound" button, top right → volume panel).
If another lane rewrites those functions, keep the lines. Everything else (shots, hits, deaths, under attack, unit lost,
building started / complete, unit ready, low power / power back, shouts, victory / defeat) is found by `observe()` from
the sim state — the sim (`godot/sim/`, another lane) is not touched.

## Honest gaps (priority order)
1. **Not heard yet because the Godot sim does not have the thing**: missile launch / whistle / falling bomb / mega blast /
   alarm (generals' powers), drone and helicopter/jet sounds beyond the engine loops, promotion chime, radio keys `air`,
   `armL`, `armR`, `msl`, `hab`, `town_*` (no event in the sim raises them; the clips and the `Audio.radio(key)` call are
   ready), announcer `upgrade`, `strikeReady`, `enemyStrike`, `lineCut`, `roadTaken`, `reinf` (call `Audio.ann(key)` when
   the sim grows them). Shouts `reload`, `grenade`, `medic` have no trigger in the Godot sim either.
2. **Per-voice low-pass is 3 steps** (near / mid 4.2 kHz / far 1.5 kHz buses) instead of the JS's continuous curve; the
   hall reverb is Godot's reverb at 10 % wet instead of the JS impulse. On the **web build Godot skips bus effects**
   (compressor, limiter, EQ, low-pass, reverb) because it plays samples through WebAudio; volumes, pan, ducking and
   limits are the same.
3. The weather beds: wind and battle rumble are in; rain needs the sim's weather (not ported); the JS's code-made wind
   gusts / sand hiss (09d-mix ambTick) are replaced by the recorded wind loop only.
4. Device speech fallback (speechSynthesis) is not ported: all 22 playable nations have recorded sheets, so it is never
   needed.
5. `main.gd` (Test range scene) has no hook: it gets the menu music and button ticks from the autoload by itself, but no
   battle sounds. Give it the same two lines (`Audio.battle_start`, `Audio.observe`) if the Test range should sound.
6. The "My music" import and the announcer-volume slider of the JS settings are not in the panel (the announcer level is
   stored as `announcer` in `user://audio.cfg`, default 80).

## Check it
- `godot --headless --path godot res://audio/test_audio.tscn` → `AUDIO TEST PASS`
- A battle with the sound log: `godot --headless --path godot res://scenes/battle.tscn -- --battle-ai --fac=IR --vs=US --seed=1 --minutes=14 --audio-log=/tmp/a.log --audio-demo`
  (`--audio-demo` stands in for the player's clicks: one select / move / attack line every 6 s).
- Recording: `xvfb-run -a godot --path godot --rendering-driver opengl3 --resolution 320x180 --write-movie out.avi --fixed-fps 30 --quit-after 2000 res://scenes/battle.tscn -- --battle-ai --fac=IR --vs=US --seed=1 --shot-t=330 --cam=auto --audio-log=cap.log --audio-demo`
- Web: export (templates 4.4.1 needed), then `node godot/audio/tools/web_check.mjs <export dir>`.
