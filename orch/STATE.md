# STATE — conductor run 2026-11-11 08:55 UTC (state only)

**This run did step 1 only:** train `train/20261111-0801` (maps fix for river/ridge starts + map sweep gate, 3 commits,
head 56f1ad34) was pushed ~50 min before this run and is not in main, so another conductor run owns the landing.
Note: that train's head has NO gate statuses and no `gate/56f1ad34` branch yet — if it is still ungated at the next run, the
earlier run died and the next run should take the train over.

**main** = 32cb2a11 (Game feel slices 1+2). Gates: 27 green, red: `gate/audio`, `gate/cfclient`.
(The six gates named in CLAUDE.md "RIGHT NOW" are green now except cfclient; audio is a new red.)

Ages are minutes since the last commit on the branch. "new red" = red on the branch's own gate that main does not have.

## Active in the last 8 hours

| Idea (branch) | Last save | Ahead | Stopped (handoff) | Own gate result | Verdict |
|---|---|---|---|---|---|
| Calm campaign map (orch/calmmap) | 25m | 5 | yes | gate 0fa0b84f still running (13 green so far); earlier pass 4d08b0ae all 28 green | ready once its gate finishes |
| Real supply lines, slice 1 (orch/c-supply) | 25m | 1 | yes | gate 8d9cac55 still running (7 green so far) | wait for gate |
| Mountain fix (orch/mtnfix) | 34m | 6 | no | no gate on head yet | still working |
| Game feel (orch/q-feel) | 53m | 0 | yes | LANDED (main head) | done |
| One look (orch/q-look) | 87m | 0 | yes | LANDED | done |
| Commander's radio (orch/extras-battle) | 362m | 1 | no | new red: grandlive, migrate-down | not ready |
| Battle report card / Front news (orch/lang-campaign) | 365m | 3 | no | gate 0aee4922 (older commit): new red `check`; head ungated | not ready |
| Army Standards tokens (orch/armytokens) | 367m | 7 | yes | new red: decisions, mpsync, tutorial | not ready |
| greenK4 | 367m | 4 | yes | head ungated | stopped |
| One setup for all three games (orch/seamless-flow) | 373m | 1 | no | new red: smooth-pc (look change, blocked) | not ready |
| Calm map 3 (orch/calmmap3) | 375m | 5 | no | head ungated; base 4d08b0ae all green | waits behind calmmap |
| Edge alerts (orch/extras-command) | 383m | 1 | no | new red: smooth-pc | not ready |
| Frame-time governor (orch/speedS) | 388m | 3 | yes | gate cf33e78f (older commit): same as main minus audio | candidate (changes sim timing, goes last) |
| One language 3 (orch/lang-battle) | 389m | 2 | no | only cfclient red (same as main) | candidate |
| Escalation (orch/c-escalation) | 394m | 3 | yes | new red: tutorial | not ready |
| greenK3 | 398m | 3 | yes | — | stopped |
| Main menu shows your war (orch/extras-story) | 412m | 1 | no | new red: controls | not ready |
| Proxy warfare (orch/c-proxy-warfare) | 414m | 8 | yes | gate 7ba01be2 (one commit behind head) all 28 green | candidate (campaign) |
| One language (orch/onelanguage) | 419m | 5 | no | head ungated | unknown |
| War support at home (orch/c-war-support) | 419m | 2 | yes | only audio red (same as main) | candidate (campaign) |
| Stockpiles (orch/c-stockpiles) | 455m | 4 | yes | new red: tutorial | not ready |
| American spelling (orch/q-american) | 460m | 1 | no | all green | candidate |
| Playtest card (orch/loop-playtest) | 462m | 1 | no | only audio red (same as main) | candidate |

## Parked finished pieces (older than 8 h, not in main)

| Idea (branch) | Age | Ahead | Own gate | Note |
|---|---|---|---|---|
| UK/Australia/Canada voices (orch/voicesV) | 13h | 3 | audio + cfclient red (same as main) | candidate |
| Campaign panels + readability (orch/polishP2) | 15h | 1 | new red: smooth-mp, tutorial (gated on old red main) | needs a fresh gate |
| Report a problem (orch/safetyH) | 19h | 3 | gated on old red main | needs a fresh gate |
| End screen stats (orch/dashJ) | 19h | 2 | gated on old red main | needs a fresh gate |
| Stuck-units fixes + controls feel (orch/greenK-snap 6, greenK-qfeel 9, dashI 3) | 19–25h | — | landing attempt gate 1bb5e663: new red mpsync | not ready |
| No floating windows/doors (orch/winfix) | 20h | 1 | gated on old red main | needs a fresh gate |
| Grand snap loop, autosave loop, q-sound, leadersC, speedD | 23–28h | 1–3 | old | stale |

## Locks with nothing saved (90+ minutes, no work branch)

- **Real war** (`taken/realwar`, 7 h 15 m) — no `orch/realwar` branch: nothing saved.
- **Seamless HUD** (`taken/seamless-hud`, 7 h 15 m) — no `orch/seamless-hud` branch: nothing saved.

(`taken/c-real-supply` → saved as orch/c-supply; `taken/army-standards` → orch/armytokens; all other locks have a branch.)

## For the next train (order)

1. maps fix train 0801 (if the earlier run did not land it) → 2. calmmap (after its gate) → calmmap3 → 3. q-american, lang-battle, loop-playtest
→ 4. c-war-support, c-proxy-warfare → 5. speedS last. winfix / safetyH / dashJ / polishP2 need a fresh gate on today's main first.
