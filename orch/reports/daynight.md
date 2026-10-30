# Day/night (orch/daynight)
- New battle-setup Conditions buttons: **Night** and **Changing** (Dusk already existed). Day/Clear/Golden/Overcast = exactly as before (headless hash identical to main).
- Night: everyone's sight x0.6; tanks, helicopters, jets, drones, commandos/snipers and recon keep x0.9. Dusk x0.8 / x0.95. Changing = day, dusk, night, dawn, 5 game-min each (20 total), then repeats.
- Look: dark sky/ambient/sun, windows and lamps lit, bigger flash/explosion glow (existing FX; no new lights, so phones on Low pay nothing extra). Changing switches look in steps (no fade yet).
- HUD: the top-right chip shows NIGHT/DUSK/DAWN with the sight penalty.
- Sync: the setting rides on the existing Conditions value (host, clients and the Cloudflare server all read it; sight is a pure function of game time).
- Test: `node orch/headless.mjs --night` (added to the existing headless CI job).
- Shots: orch/shots/daynight/desktop-day.png, desktop-night.png (via `DN_W=4 node orch/smoke.mjs`). NOT done: phone-Low shots and phone frame-time (my harness hung; unchanged cost expected). Night brightness got a small bump after the shot.
- Simulation changed: needs the main -> servers-live PR.
