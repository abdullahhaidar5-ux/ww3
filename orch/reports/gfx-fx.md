# Graphics Phase 4: light and effects (branch orch/gfx-fx)

**What looks different** (visual only; the simulation never reads it)
- Big explosions: fireball lingers and rolls up, cooling to dark red; tumbling debris chunks on heavy hits (PC);
  a low ground-coloured dust cloud hangs for 6–9 s; the biggest blasts leave a dark smoke column climbing and leaning
  downwind for up to 16 s.
- Burning wrecks: wider, taller smoke columns (PC).
- Muzzle flashes and tracers briefly light the ground (2 own lights on PC). Fixed: muzzle light was ~3x too dim since r186.
- Theatre colour grade: desert warm and dusty, snow cold, green neutral with blue-grey haze, dusk pushed red; distance
  haze takes the theatre colour (was always sand).
- Stable shadows: shadow box snapped to texels and zoom steps, so edges no longer crawl while scrolling.
- Phones: no new lights, no dust/billow/debris; columns only from the biggest blasts at half rate. Particle caps unchanged.

**Shots** orch/shots/gfx-fx/: before/after close-ups (fulda, golan, arctic, dmz dusk; same seed, same camera)
and boom-1/2/3 explosion sequence.

**Frame times** (SwiftShader, noisy; explosion probe fxshots.mjs --perf)

| | before | after |
|---|---|---|
| Phone 390×844, 4× CPU, median ms | 82.7 / 125 | 84.3 / 91.1 / 107 |
| Phone p90 ms | 264 / 1043 | 219 / 220 |
| Desktop 1280×720 mean ms | 6895 | 7014 |

Phone not slower within noise; desktop +2%.

**CIGATE PASS 16/16** on 402447294a (origin/main and orch/three-upgrade merged).
