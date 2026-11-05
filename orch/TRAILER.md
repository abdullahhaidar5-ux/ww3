# WORLD WAR 3 trailer (2026-11-04/05)

Output: `trailer/ww3-trailer.mp4` (1080p H.264 + AAC, ~65 s, ~23 MB, ~-15 LUFS) and `trailer/poster.jpg`.
Served by Pages at https://abdullahhaidar5-ux.github.io/ww3/trailer/ww3-trailer.mp4 (poster: `.../trailer/poster.jpg`).
All footage is real in-game rendering (headless Chromium, software GL, PC High look, HUD hidden); no `src/` changes.

## Shot list (in order)
18 NATIONS (zagros horizon, smoke, mountains) · nation menu still · Iranian base with flags · weathered IR vehicles (parade) ·
MASSIVE ARMIES (Mountain Shias column, fulda) · FIGHT ONLINE WITH FRIENDS (forest clash) · LAND · SEA · AIR (gunships + drones) ·
naval fleet + naval strike (Bab-el-Mandeb, Coffee Shias vs Saudi Arabia) · NIGHT AND STORM (flare-lit bridge fight, low march) ·
sandstorm column (Empty Quarter) · snow column (Arctic) · MOUNTAIN FORTRESS + Bunker Buster impact · CAMPAIGN MISSIONS (mission "town") ·
supply/ammo HUD still · WORLD WAR 3 finale (hundreds of infantry) · end card.
Not shown (cut for render time): submarine torpedo close-up, coastal missile close-up, jets in flight.

## Music / audio
Music: "Act of War" by Alexandr Zhelanov, CC-BY 3.0 (`mus/st/combat-06.mp3`), credited on the end card.
Effects: `sfx/sfx.mp3` clips (booms placed on the real explosion frames, gun bursts, tank/heli/jet/wind loops).
Voices: battle cries from the `vo/<CODE>.mp3` sheets (RS/DW/IR "Labbaik ya Hussein" category, RU, US). The sheet clip was chosen from
the offset tables, not by ear — listen once and fix `VOICES` in `orch/trailer.py` if a line is wrong.

## How to re-render
1. `python3 orch/build.py` (merge origin/main first so the newest looks are in).
2. Capture frames (very slow: software GL, 8–30 s per frame; 1280x720 at 10–15 fps, interpolated to 30 fps later):
   `node orch/trailer.mjs --fps 10 --scene fort,naval,columns,night,storm,snow,camp`   (`--list` shows scenes, `--preview` takes 4 test frames per shot,
   `--skip scene-shot` leaves a captured shot alone). Scenes/camera paths: `orch/trailer-scenes.mjs`. Frames land in `orch/shots/tr/<scene>-<shot>/` (git-excluded).
3. `node orch/trailer-hud.mjs` for the two full-UI stills (menu, supply bars).
4. `python3 orch/trailer.py` builds per-shot clips (motion interpolation, grade, 2.39:1 letterbox, titles), the end card, the audio mix and
   `orch/shots/tr/work/video.mp4` + `mix.wav`; then mux with `loudnorm` and encode:
   `ffmpeg -i video.mp4 -i mix.wav -map 0:v -map 1:a -af loudnorm=I=-14:TP=-1.5 -c:v libx264 -preset medium -crf 24 -maxrate 2900k -bufsize 6000k -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 160k trailer/ww3-trailer.mp4`.
