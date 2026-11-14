# HANDOFF weathergfx (branch orch/weathergfx)

## What a player sees
**Conditions picker** (Battle options screen, the online lobby, and a small row in the Test range panel): Random · Day · Dusk · Night · Rain · Sandstorm · Snow.
- It fits the map: Rain only on temperate maps, Sandstorm only on desert/Gulf maps, Snow only on snow maps (or any map set to Winter snow). Unfitting buttons are greyed out. If you change map and your pick no longer fits, it falls back to Day. The game also coerces an unfitting value (e.g. from a link), so host, clients and server always agree.
- Random picks from the battle seed only among what fits (Day twice as likely, Dusk, Night, the map's weather). Same seed = same sky for everyone online.
- A picked Day/Dusk/Night stays that way (no random rain or fog rolls on top). The old Golden hour / Overcast / Changing buttons are gone from the picker (old saves still load).
- Small, fair effects: night sight 0.6 -> 0.75 (thermal/night-vision units unchanged-ish), dusk 0.8 -> 0.9, sandstorm vision 0.55 -> 0.75, accuracy 0.8 -> 0.88, speed 0.88 -> 0.92, jets no longer grounded (air 0.5, flying slower).
- Test range: the same seven options live in its panel, applied instantly (never synced).

**Graphics presets** (Settings -> Graphics): Low / Medium / High / Ultra, one row. Saved "Medium" from the old setup is the same as the default.
- Low: lightest effects, lower resolution (old Low). Medium: today's default (governor starts at full quality, steps down only when frames are missed). High: fixed full quality. Ultra: High plus 1.5x picture resolution, 4096 shadow map, 40% more dust/smoke.
- First launch picks by the existing quick device check (now Low / Medium / High / Ultra).
- Not mapped: draw distance and LOD distance (no separate knob exists; they follow the effect level), so I left them alone.

## Code
01-data (CONDS, condTheme, condFits, condFit), 03-sim (newGame resolves G.wxB, checkpoint key `wxB`), 04-gfx, 05-fx3d (particle budget), 07-net/08-ui (condUI, sbCond, GFX_PRESETS), 08m-controls (device check). Guards in orch/decisions.mjs; new test `node orch/weathergfx.mjs` (WEATHERGFX PASS, writes the shots).

## Screenshots
orch/shots/weathergfx-{day,dusk,night,rain,sandstorm,snow,low,ultra}.jpg (rain on Bosphorus, sandstorm on Hormuz, snow on Arctic, the rest on Bosphorus). Software GL, so Ultra/Low look similar in stills.

## Gates
Local: build + --check OK, SMOKE PASS, WEATHERGFX PASS. cigate: see below.
