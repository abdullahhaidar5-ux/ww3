# Audio SFX report (branch orch/audio-sfx)

**What changed.** Rifles, MGs, cannons, rockets and small/large explosions now play real recordings (random clip + slight pitch variation); the old synthesized versions remain only as fallback while the sheet loads or if it can't. New loops: tank, truck, helicopter and jet engines (fade in with units near the camera), wind (stronger in snow/blizzard/sandstorm), rain, and a distant-battle rumble that grows with the fighting. Distance = volume + low-pass + slight delay; theatre echo: desert dull/wide, green country slap-back, snow/mountain long tail. Mix: voices duck music (to 55%) and effects (72%) for ~1.3 s; max 28 simultaneous recorded sounds (16 on phones). iPhone unlock and sliders untouched; all effects loops obey the Sound slider.

**Sources (all OpenGameArt, credited in menu credits):** CC0 – Bart (Free Firearm Sound Library), Thimras, EZduzziteh, theMinesAreShakin, WuxiaScrub, Bashar3A, Kresiek The Furry. CC-BY 3.0 – Michel Baradari, Lamoot, Nayckron, kurt, dklon, gryc. Freesound/Sonniss unreachable from the shell, not used. Built by `sfx/sfx_pack.py`.

**Sizes:** sfx.mp3 sprite sheet 375 KB (mono 32 kHz 80 kbps, fetched at first battle sound); loops 34–129 KB each, ~980 KB in total, each fetched only when needed. Nothing downloads in the menu.

**Checks:** `build.py --check` now verifies sfx/ manifest and menu credits. `orch/audio.mjs` extended (sheet loads, sounds play from it, cap, ducking, loops, each file fetched once, none in menu).

**CIGATE:** PASS, all 16/16 on 55499b4 (run via gate/ branch push).

Not done: artillery uses the cannon clips pitched down (no dedicated recording); no separate near/far recordings (distance filter instead).
