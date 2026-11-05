# Role voices — audio-1103 (2026-11-03/04)
Every unit type now speaks its own lines. 9 voice roles x (select, move, attack) x 2-3 lines, native language, same engines/speakers/radio chain as the approved "tough2" pass (`orch/vo/roles.py`, lines in `tools/voices/roles_lines.py`, one sheet per nation `vo/<CODE>_r.mp3`, offsets `VOR` in `src/09-audio.js`).
Roles (kind -> role table `VO_ROLE` in 09-audio.js): inf; elite (hero, saka, guer, recon, hacker); at (at, atk, atgm); tank; veh (aa, arty, mortar/rocket teams, idome, ew, cbr, jeep, raidlead); pilot (heli, jet, airlift, drone); navy (boat, ship, lander); eng (dozer, harv, sapper, medic); leader (cleric/Ayatollah, officer, commissar).
Playback: on select/move/attack the role of a random selected unit picks the clip; no repeat of the previous clip; old global 1.3 s cooldown + one-line-at-a-time still apply; the old nation sheet is the fallback (nations/roles without role clips, sheet not loaded).
Shia IR / RS / DW: 3 lines per kind, one in each triple carries the slogans (Labbaik ya Hussein, Ya Ali, Ya Zahra, Ya Sahib al-Zaman, Ya Abal-Fadl, Haihat minna al-dhilla); existing sheets untouched.
Done (16): IR RS DW (3 lines) + US TR RU EU UA CN SA AE EG PK IN IL CU (2 lines). Sheets total 6.2 MB.
KR, KP: shipped 2026-11-04 (see voices-krkp below) — all 18 nations now have role voices.
Quality caveats: CPU run; one take per line with Whisper read-back QC (5 takes max) for non-Hindi; Hindi/Urdu (PK, IN) checked by length only; CU/others from the first pass have only a length sanity check (CU "Equipo antitanque listo" ~6 s long). IR/UA/IL use Piper/MMS as before. No human listening yet — samples in `orch/voices-1103/`.
Music items (Asian stand-ins, real ney): obsolete — the synthesized per-nation score and `mus/as_pack.py` were replaced by the shared soundtrack; nothing to do.
Test: `node orch/rolevoice.mjs` (ROLEVOICE PASS).

## leftovers-1104 update
KR/KP still NOT shipped: XTTS Korean on a 2-core CPU runs ~3 min per line (4-5 QC takes each), ~5 h for both nations. 19 of 54 KR lines done; raw takes saved on branch orch/leftovers-1104 (orch/vo/cache-kr-kp). Handoff has the exact resume steps and speed-up options. KR/KP keep their old shared lines meanwhile.

## voices-krkp update (2026-11-04) — KR/KP shipped, all 18 done
KR (standard Korean, ROK army register: 충성/필승) and KP (North Korean military register: 동무, 결사옹위, 앞으로) role sheets `vo/KR_r.mp3` (604 KB) and `vo/KP_r.mp3` (555 KB), 54 lines each, same speakers (KR Dionisio Schuyler/Luis Moray, KP Damien Black/Baldur Sanjin, cmd Viktor Eka) and tough2 radio chain.
KP leader = "Dear Leader" lines (경애하는 지도자 동지, 명령하십시오 / 지도자 동지의 명령을 기다립니다 / 경애하는 지도자 동지를 위하여!), dignified, no real names. Two KP lines reworded shorter because every take babbled (tank "전차, 앞으로!", leader "조국을 위하여!").
Speed fix in `orch/vo/roles.py` (Korean only): stop after 2 XTTS takes unless the Whisper read-back is clearly wrong (penalised score >= 1); clearly wrong lines get up to 5 takes, then the babble is cut right after the line using Whisper word timestamps (re-verified by a second read-back), then the nation's other soldier voice is tried. Whisper read-backs are cached in `$VO_CACHE/whisper_rb.pkl`, so reruns are fast.
Result: 103/108 lines pass QC cleanly; 4 short shouts (사격!, 필승!, 이륙한다, 적함에 사격!) have the right length but Whisper can't read them back (radio-shout lines); 1 known long take: KR navy "출항한다." 4.9 s (babble tail). No human listening yet — samples `orch/voices-1104/KP_tank_attack.mp3`, `KR_rifleman_attack.mp3`.
Gate: all green except gate/controls 136/138, which fails identically on main before this change: phone rally-point checks ("rally-point ground is clickable", "left-click ground with a production building selected sets its rally point") — not audio-related.
