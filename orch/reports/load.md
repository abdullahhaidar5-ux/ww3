# Load time report (loadF, 2026-11-10)

Method: `node orch/loadtime.mjs <dir> <tag> "<query>" <Mbps>` — serves the repo gzip-compressed on localhost, Playwright Chromium
(software GL), 40 ms RTT, throttled download; "menu" = main menu visible; "open grand" = click Grand campaign → its screen shown.
Sandbox CPU is slow, so absolute numbers are pessimistic; the before/after ratio is what matters. ("warm" here only reuses the
HTTP cache; it is not a fully warm service-worker run.)

| | before | after |
|---|---|---|
| index.html | 5.34 MB | 3.35 MB (grand campaign + ground textures moved out) |
| menu, 10 Mbps | 4.2 s | 2.5 s (-42%) |
| menu, 3 Mbps | 8.6 s | 6.3 s (-27%) |
| main-thread startup (DOMContentLoaded) | ~1.3 s | ~0.6 s |
| open Grand campaign | 0.2 s | 0.3–0.4 s first time (1.1 MB bundle, prefetched at idle so usually instant) |

What changed: (1) `src/13*` → `grand.<hash>.js` loaded on demand by `src/12zz-grandload.js`; (2) the two ground-detail textures
(0.9 MB of base64 in 04-gfx) → `terr_a/n.<hash>.webp`; (3) the Conquest setup box's map preview (a full map generation, 0.6 s) now
runs ~4.5 s after load and never during a battle. Profile before: mkMap+segDist ≈ 0.6 s of the 1.3 s startup.
Not done (small gains, more risk): deferring encyclopedia/credits text; the vendored Three.js (0.8 MB) is needed for the menu background.
Offline: `sw.js` saves grand + textures at install (`LAZY`); cache name bumped to ww3-v4. Artifact/`--single` stay one inline file.

## Living main menu (finish-menu, 2026-11-12)

Same method (`node orch/loadtime.mjs <dir> <tag> "" 10`, two runs each, sandbox): main = menu 2.85 / 2.92 s cold; with the living menu
(measured together with a 68 KB bundled-font block that was later taken out again) 2.99 / 2.85 s cold — the same within run-to-run noise.
The war-table background is drawn once, after the menu is visible (when the save list has been read), from a 1–13 KB note; the grand
bundle is not loaded for it (smoke checks this).
