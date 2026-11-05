# Extras: highlight clip, Photo mode, voice commands (2026-11-05)

All UI only (new module `src/08c-extras.js`, plus a 2-line camera hook in `06-view.js` and 3 one-line hooks in `08-ui.js`). Orders go through `doAct`, so multiplayer sync is untouched. QA: `node orch/extrastest.mjs` (prints EXTRAS PASS), screenshots in `orch/shots/extras/`.

## 1. Save clip
The end-of-match BATTLE REPLAY is recorded while it plays (`canvas.captureStream` + `MediaRecorder`, mp4 where the browser supports it, e.g. iPhone Safari, else webm; battle sound added from the audio master when the audio engine is up; capped at 15 s). The end screen gets a **Save clip** button next to Save screenshot: it opens the share sheet with the file (`navigator.share`) or downloads it. Hidden where MediaRecorder/captureStream are missing.

## 2. Photo mode (P, or menu ☰ > Photo mode)
Single player: the battle pauses. Online: the game keeps running, only your camera is freed. HUD hidden. Drag = orbit, right-drag/WASD = move, wheel/pinch = zoom, Q/E = turn, two-finger drag/pinch on touch. Five film looks (Natural, Warm dusk, Cold steel, Newsreel B&W, Faded film: grade + tint + vignette) and a Focus-blur toggle (cheap tilt-shift). **Take photo** bakes the look into a PNG at the game's canvas resolution and offers Share / Download. Esc or P leaves and restores the camera and pause. Shift+P still pauses as before (plain P now opens Photo mode, because it pauses single player anyway).

## 3. Voice commands
Hold the mic button (in the command bar next to Pause) or hold **V** (a quick tap of V still cycles stance). Web Speech API, hidden where unsupported; the mic permission prompt only appears on first press. Words: attack (attack-move to "here"), retreat / fall back, hold, move here, select all tanks / infantry / army, guard (here), capture the town (nearest town not yours), stop. English, Arabic and Persian words are all understood whatever language the mic listens in; the ☰ menu item "Voice language" switches the listening language (EN / عر / فا). "Here" = last cursor/tap on the map, else the screen centre. A banner shows what was heard and what it did, or why it could not.

## Notes
- Phones are abandoned per CLAUDE.md (2026-11-04), so no phone screenshots; the controls are touch-capable anyway.
- Photo resolution = the game's canvas size (so a 1080p window gives a 1080p picture).
