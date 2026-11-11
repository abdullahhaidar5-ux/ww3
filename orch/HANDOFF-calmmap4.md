# HANDOFF calmmap4 (2026-11-11, fourth pass)

Branch `orch/calmmap4` = `orch/calmmap3` (7273327) + main (0ac7cde, merged; only the built files conflicted and were rebuilt) + this pass.
Not gated on GitHub and not landed - the conductor batches it. Files touched by this pass: src/13e-grand3d.js, orch/grandtest.mjs, pictures in orch/shots/calmmap4/.

What this pass found and did
1. Egypt / Saudi Arabia colours. The neighbour rule in `grPalAdj` (src/13-grand.js) already links countries that face each other across a narrow sea
   (EG-SA, IR-SA, IR-AE, IR-KW, GR-TR, IT-HR, IT-AL, ES-MA, GB-FR, SA-SD, SA-ER all linked) and `grPaletteBad` is empty for every playable nation
   (Egypt #c2a356 sand, Saudi Arabia #00877f teal when playing Iran or the US). No colour code changed. What was missing was a guard - there was none at all:
   orch/grandtest.mjs now fails if one of those sea pairs is not linked or if any playable nation gets look-alike neighbours.
   Tried widening the sea distance (45 -> 54/60 map units, adds IT-TN and EG-TR): it leaves one clash (IL-TR when playing BI), so it stays at 45.
2. Close view. Only nation capitals keep a name plate. Other provinces are plain small text on the ground (class `b pn`: no pill, no flag, no country line),
   shown only for the province under the cursor, the selected province and your own provinces within `G3_PN_NEAR` (60 map units) of the selection.
   Army tokens of every nation win against a province name (the name moves below/above the token or hides). Same label pool and collision list as before (g3Labels).
   Guard: grandtest "calmmap4: close view shows province name plates again".
3. First-minute box. On this branch it is already the compact strip from main (three lines at 1600 px, goes away on Got it, on the first right-click order or after 60 s;
   guard: coachH <= 90 px). The longer text that explains tokens lives on `orch/armytokens`, which is in neither main nor calmmap3.
   When armytokens is merged: keep main's strip text in guCoach (src/13c-grandui.js) and put the token sentences into the map key (g3Legend, src/13e-grand3d.js)
   as rows: "Round token = an army; flag = whose", "White rim = yours, red rim = enemy", "Green ring = strength", "Good / Even / Bad odds show on enemies in reach of your selected army".
4. Capital names. All 180 nations checked through `grCapName`: every capital plate reads the city (Yerevan, Tbilisi, Astana, Tripoli, Nicosia, Algiers, Rabat, Muscat ...).
   Left as they are because the capital province itself is that city in the map data (changing it is a data decision, not a label fix):
   Turkey = Istanbul (real: Ankara), Nigeria = Lagos (Abuja), South Africa = Johannesburg (Pretoria), Israel = Tel Aviv; BI's seat shows its province name "Euphrates Badlands".

Seen in the pictures, not changed here
- Army flags still wave in the middle view on this branch. The one-line fix is on `orch/calmmap` (1a0865f, "flag follow-up"); it merges cleanly.

Pictures (1600x900, Iran, seed 99): orch/shots/calmmap4/start-*.png (branch before this pass) and after-world / after-middle-east / after-close.

Tests on the sandbox: see the last lines of this file.
- At commit e89c0dd (code; later commits are pictures and notes only), run one after another on the sandbox: `python3 orch/build.py` + `--check` OK, `node orch/grandtest.mjs` GRANDTEST PASS,
  `node orch/smoke.mjs` SMOKE PASS, `node orch/decisions.mjs` DECISIONS PASS. Smooth gates not run here (sandbox too slow by rule) - GitHub's gate run decides.
