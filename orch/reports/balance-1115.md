# Balance 1115 (polishD)
Runs (AI vs AI, `--swap`, Normal AI, maps strait/oasis/plateau): (a) 2 games/nation, 8-min cap, 44 matches, almost all draws (everyone 25-63%, nothing decisive); (b) `--games 4 --minutes 15 --seed 11`, 88 matches, 28 decisive. Only ~8 games per nation in (b), so +/-17% noise.
Win% (b): PK 75, EG 69, AE 69, IL 63, TR 63, DW 63, OB 63, RU 63, RS 63, IN 50, DE 50, GB 50, JP 50, SA 50, IR 50, KR 44, RV 38, FR 31, CN 31, KP 25, UA 25, US 19. Pooled with (a): US ~29, KP ~33, UA ~33, PK ~60.
Zealous nations (IR RS DW RV KP OB) never rout: unchanged, guard still in decisions.mjs.
Nudges (modest, only the nations low in both runs): US "fewer but stronger" cost +8% -> +4%, build time +10% -> +5% (IL keeps +8/+10: 63%); KP KN-25 battery 900 -> 800; UA FPV team 350 -> 300. PK (75%) not touched: one run, noisy.
Not clearly out of 40-60% after pooling: nothing else. Re-run `node orch/tourney.mjs --games 8 --minutes 15 --swap` after this lands to confirm US/KP/UA.
