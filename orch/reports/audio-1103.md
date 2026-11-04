# Role voices — audio-1103 (2026-11-03/04)
Every unit type now speaks its own lines. 9 voice roles x (select, move, attack) x 2-3 lines, native language, same engines/speakers/radio chain as the approved "tough2" pass (`orch/vo/roles.py`, lines in `tools/voices/roles_lines.py`, one sheet per nation `vo/<CODE>_r.mp3`, offsets `VOR` in `src/09-audio.js`).
Roles (kind -> role table `VO_ROLE` in 09-audio.js): inf; elite (hero, saka, guer, recon, hacker); at (at, atk, atgm); tank; veh (aa, arty, mortar/rocket teams, idome, ew, cbr, jeep, raidlead); pilot (heli, jet, airlift, drone); navy (boat, ship, lander); eng (dozer, harv, sapper, medic); leader (cleric/Ayatollah, officer, commissar).
Playback: on select/move/attack the role of a random selected unit picks the clip; no repeat of the previous clip; old global 1.3 s cooldown + one-line-at-a-time still apply; the old nation sheet is the fallback (nations/roles without role clips, sheet not loaded).
Shia IR / RS / DW: 3 lines per kind, one in each triple carries the slogans (Labbaik ya Hussein, Ya Ali, Ya Zahra, Ya Sahib al-Zaman, Ya Abal-Fadl, Haihat minna al-dhilla); existing sheets untouched.
Done (16): IR RS DW (3 lines) + US TR RU EU UA CN SA AE EG PK IN IL CU (2 lines). Sheets total 6.2 MB.
NOT shipped yet: KR, KP (Korean XTTS takes came out 4-6 s for 1-2 word lines = babble; first pass discarded, needs the Whisper-QC pass `python3 orch/vo/roles.py KR KP`, ~25 min each on CPU) — they keep their old shared lines meanwhile.
Quality caveats: CPU run; one take per line with Whisper read-back QC (5 takes max) for non-Hindi; Hindi/Urdu (PK, IN) checked by length only; CU/others from the first pass have only a length sanity check (CU "Equipo antitanque listo" ~6 s long). IR/UA/IL use Piper/MMS as before. No human listening yet — samples in `orch/voices-1103/`.
Music items (Asian stand-ins, real ney): obsolete — the synthesized per-nation score and `mus/as_pack.py` were replaced by the shared soundtrack; nothing to do.
Test: `node orch/rolevoice.mjs` (ROLEVOICE PASS).

## leftovers-1104 update
KR/KP still NOT shipped: XTTS Korean on a 2-core CPU runs ~3 min per line (4-5 QC takes each), ~5 h for both nations. 19 of 54 KR lines done; raw takes saved on branch orch/leftovers-1104 (orch/vo/cache-kr-kp). Handoff has the exact resume steps and speed-up options. KR/KP keep their old shared lines meanwhile.
