# HANDOFF menubg (2026-11-14, Sonnet helper)

Abdullah 17:07: "Have an epic static main menu background".

Done: the live shell battle (mxShell*, `G.shell`, CSS `.sh`/`body.mxshell`) and the "war table" overlay (mxWarTable/mxWarSrc, `#mxwt`, `#mxwar`) are removed from src/. `#mxbg` is now one static CSS background `menu-bg.webp` (repo root, picture on the left, dark gradient behind the right-hand menu column in `#mxfade`; menu works if the file is missing). The old `art/menu-bg.jpg` is deleted. Guard added in orch/decisions.mjs ("menu background").

Picture: made by `node orch/menubgshots.mjs` (IR vs US, golden hour, Zagros, 1920x1080 at the highest preset), then colour-graded + vignette with PIL and saved as webp. In this sandbox one frame takes ~10 minutes, so only a few shots were tried; if you want a better one, re-run with other `--map/--seed/--w` and re-grade.

Not done / notes: decisions.mjs and smoke were slow here (see the report line below). sw.js needs no change (it only lists models and terr_ files; the picture is fetched by the page like any file).

Refire 2026-11-14 19:50: new crisp 2560x1440 shot (seed 11) saved as menu-bg3.webp, menu-bg2.webp removed; orch/menubgshots.mjs now 2560x1440, no markers/bloom.
