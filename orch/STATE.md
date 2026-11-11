# STATE — conductor run 2026-11-11 08:00–10:45 UTC (train landed)

**LANDED on main = f3b7f596** (train `train/20261111-0801`, one tested push, fast-forward):
1. Maps fix: fairer starts on Marshes, Bosphorus, Bab el-Mandeb, Homs Gap + lighter map sweep (56f1ad34)
2. American spelling in all game text (bb4c2212) — fixer re-run after each merge (2 leftovers fixed: calm map comment text, Playtest card)
3. Playtest card in Extras (2bc6375b)
4. Proxy warfare, finished piece (8e7cdd97, commit 7ba01be)
5. War support at home, slice 1 (72854034)
(Calm map was in the train too, but its own helper landed it first as 0ac7cde6; train merged that main in.)

**Train gate (gate/f3b7f596b5):** 27 of 27 reported gates green. `gate/audio` failed once (step f/i, streaming — the same failure
main 0ac7cde6 shows and unrelated commits show) and PASSED on a re-run of that one job. **`gate/mapsweep` did NOT finish: cancelled by its
45-minute limit.** Main already had mapsweep red (37 static issues, 0/247 battles, commit 36f5a496), so nothing got worse, but
**map fairness is still unproven** — owner: orch/mapfix3 (active). Local on the train: build --check + SMOKE PASS after every merge;
decisions/grandtest were too slow in the sandbox (>10 min, killed) and ran green on GitHub instead.

**CLAUDE.md:** "Save early" rule added. "RIGHT NOW" bullet NOT removed: the six gates it names are green, but main is not fully green
(audio flaky, mapsweep red). ORCH should rewrite that bullet — it is stale.

**Runner note:** GitHub runners were slow (gate run queued ~10 min, whole gate ~75 min). A second conductor run at 08:55 correctly stood by.

## Helpers (branches with unlanded work, pushed in the last 30 h) — read at 09:25 UTC, before the landing

| idea (branch) | last save (UTC) | ahead of main | stopped note | newest own test run | red tests |
|---|---|---|---|---|---|
| mapfix3 | 11-11 09:11 | 4 | - | 7d2ba3e0ba | 2/28 done; red:  |
| calmmap | 11-11 09:07 | 2 | yes | 0fa0b84f28 | 24/28 done; red: cfclient tutorial  |
| conductor | 11-11 08:52 | 1 | - | 32cb2a1142 | 28/28 done; red: cfclient audio  |
| c-supply | 11-11 08:26 | 1 | yes | 8d9cac556d | 19/28 done; red: cfclient  |
| mtnfix | 11-11 08:16 | 3 | - | 4d08b0ae72 | 28/28 done; red:  |
| extras-battle | 11-11 02:49 | 1 | - | 60d5e246b5 | 28/28 done; red: grandlive migrate-down  |
| lang-campaign | 11-11 02:45 | 3 | - | 0aee49223e | 28/28 done; red: check  |
| armytokens | 11-11 02:44 | 6 | yes | 4eeb0c339c | 28/28 done; red: tutorial decisions mpsync  |
| greenK4 | 11-11 02:43 | 4 | yes | 7f9d5a1c86 | 28/28 done; red:  |
| seamless-flow | 11-11 02:38 | 1 | - | e1c344c7d8 | 28/28 done; red: audio smooth-pc  |
| calmmap3 | 11-11 02:36 | 2 | - | 4d08b0ae72 | 28/28 done; red:  |
| extras-command | 11-11 02:28 | 1 | - | 4a7c989031 | 28/28 done; red: cfclient smooth-pc audio  |
| speedS | 11-11 02:23 | 3 | yes | cf33e78fb7 | 28/28 done; red: cfclient  |
| lang-battle | 11-11 02:22 | 2 | - | 59e1b4a184 | 28/28 done; red: cfclient  |
| c-escalation | 11-11 02:16 | 3 | yes | f2c87c9246 | 28/28 done; red: tutorial  |
| greenK3 | 11-11 02:13 | 3 | yes | 7f9d5a1c86 | 28/28 done; red:  |
| extras-story | 11-11 01:58 | 1 | - | d1aef6c3d2 | 28/28 done; red: controls cfclient  |
| c-proxy-warfare | 11-11 01:57 | 8 | yes | 7ba01be22e | 28/28 done; red:  |
| onelanguage | 11-11 01:52 | 5 | - | none | - |
| c-war-support | 11-11 01:51 | 2 | yes | 08d47f4962 | 28/28 done; red: audio  |
| c-stockpiles | 11-11 01:15 | 4 | yes | 1e83008733 | 28/28 done; red: audio tutorial cfclient  |
| q-american | 11-11 01:10 | 1 | - | 18fe3019c2 | 27/28 done; red:  |
| loop-playtest | 11-11 01:08 | 1 | - | 5aafe339e0 | 28/28 done; red: audio  |
| voicesV | 11-10 19:52 | 3 | yes | d19894f02f | 28/28 done; red: cfclient audio  |
| polishP2 | 11-10 17:59 | 1 | - | 1e53c43f14 | 28/28 done; red: cfclient tutorial smooth-mp  |
| greenK | 11-10 16:11 | 1 | yes | none | - |
| safetyH | 11-10 13:58 | 3 | yes | 5dfef609ec | 28/28 done; red: smooth-mp grand audio tutorial decisions cfclient  |
| c-proxy | 11-10 13:50 | 1 | yes | none | - |
| dashJ | 11-10 13:48 | 2 | yes | 673e996495 | 28/28 done; red: smooth-mp audio tutorial decisions grand mpsync migrate-dual cfclient  |
| greenK-qfeel | 11-10 13:27 | 9 | - | none | - |
| greenK-snap | 11-10 13:27 | 6 | - | none | - |
| winfix | 11-10 12:23 | 1 | - | effcba30a0 | 27/28 done; red: grand cfclient tutorial decisions smooth-mp  |
| loop-grand-snap | 11-10 09:59 | 1 | - | 35e7ecdf54 | 28/28 done; red: tutorial smooth-mp icons cfclient decisions grand  |
| q-sound | 11-10 08:36 | 1 | - | a210f9ee06 | 28/28 done; red: tutorial smooth-mp grand cfclient decisions  |
| loop-autosave | 11-10 07:39 | 2 | - | none | - |
| leadersC | 11-10 07:39 | 3 | yes | none | - |
| dashI | 11-10 07:24 | 3 | yes | none | - |
| speedD | 11-10 04:45 | 1 | - | none | - |

Reds on runs older than ~6 h were measured against the old red main (cfclient, tutorial, decisions, smooth-mp, grand were red there) —
those pieces need a fresh gate on today's main before they can ride a train.

## Locks with nothing saved (90+ min, no work branch)

- **Real war** (`taken/realwar`, 9 h) — nothing saved.
- **Seamless HUD** (`taken/seamless-hud`, 9 h) — nothing saved.
(`taken/c-real-supply` → orch/c-supply; `taken/army-standards` → orch/armytokens.)

## Stopped / not ready, and why

- Army Standards tokens (armytokens): own gate red on decisions, mpsync, tutorial — needs its helper.
- One setup for all three games (seamless-flow), Edge alerts (extras-command): look changes with smooth-pc red on their own gate — blocked.
- Commander's radio (extras-battle): grandlive + migrate-down red. Main menu shows your war (extras-story): controls red.
- Battle report card / Front page (lang-campaign): `check` red (build out of date).
- Stuck-units fixes + controls feel (greenK-snap, greenK-qfeel, dashI; landing try 1bb5e663): mpsync red — nobody is working on it.
- Stockpiles (c-stockpiles), Escalation (c-escalation): tutorial red on old main — need a fresh gate.
- polishP2, safetyH, dashJ, q-sound, loop-grand-snap, loop-autosave, leadersC, speedD, voicesV: parked 12–28 h, gated on old red main or not at all.
- winfix: already on main (e57b7661) — nothing to do.

## Next train (order)

1. One language 3 (lang-battle) and UK/AU/CA voices (voicesV) — were same-as-main; 2. calmmap follow-ups (calmmap head, calmmap3, mtnfix) once their gates finish;
3. Real supply slice 1 (c-supply) after its gate; 4. Stockpiles, Escalation after a fresh gate; 5. frame-time governor (speedS) last.
All pieces must first merge today's main and re-run the American spelling fixer (`python3 orch/american.py`), or `gate/decisions` goes red.
