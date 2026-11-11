# STATE — conductor run 2 on 2026-11-11, 10:37–12:00 UTC (second train landed)

**LANDED on main = ac59908f** (train `train/20261111-1037`, one tested push, fast-forward):
1. Grand map colours + labels + softer mountains (orch/mapfix3 = calmmap3 + mtnfix) — d927b63a
2. Every button says what it beats (orch/lang-battle) — 5eea2ef1 (4 conflicts with American spelling: took the feature side, re-ran the fixer)
3. Campaign real supply, slice 1 (orch/c-supply 8d9cac55) — 2b78f6dd
4. Campaign stockpiles, slice 1 (orch/c-stockpiles) — ff382edb (kept both `wsCensor` and `gmilOrder/gmilSend` in the online action list, src/13zn-gnet.js)
5. Campaign escalation ladder, slice 1 (orch/c-escalation) — f919210f (kept both test blocks in orch/grandtest.mjs)

**Train gate (gate/ac59908f43):** all 28 green. `gate/smooth-pc` FAILED on the first try (p99 frame 695 ms, allowed 614; worst-1% 1.19 fps, allowed 1.7)
and PASSED on one re-run of that job (p99 474 ms, worst-1% 1.78 fps — only just inside). Both runs were on slow runners (load 110–127 s vs 74 s for
main's last run, which had p99 230 ms / 3.88 fps). **Watch `gate/smooth-pc` on main ac59908f**: if it is red there twice, look first at
"what it beats" (matchUp in the battle HUD), the only battle-screen change in this train. Local on the train: build --check + SMOKE PASS after every merge.

**NOT taken:** frame-time governor (orch/speedS) — its own helper wrote "p95/p99 worse in a single run; not landed". Army Standards (decisions/mpsync/tutorial red).
orch/calmmap4 is being worked on right now (pushed 10:35Z) — left alone.

The 07:55Z note from ORCH that came with this run was out of date (it said nothing had landed and builders were stopped); builders are pushing again.

---
(stand-by run of 11:00 UTC below: helper table read then, before this landing)

# STATE — conductor check 2026-11-11 10:50–11:05 UTC (stand-by run: state only, no train)

**Why no train this run:** another conductor run is working. `train/20261111-1037` (d927b63a, saved 10:38 UTC, 5 commits ahead of
main, not landed) = grand map colours (one political palette), every country findable, real capital names, quieter roads,
softer mountains (mapfix3 + mtnfix pieces). At 11:00 UTC it had no test statuses yet. This run did step 1 only, as the rules say.

**Main = f3b7f596** (train 0801: maps fix, American spelling, Playtest card, proxy warfare, war support slice 1).
**All 27 reported gates on main are GREEN**, including smooth-pc, smooth-mp, grandsmooth, audio, plus deploy/site.
(`gate/mapsweep` reports no status on main — it was cancelled by its 45-min limit last run; map fairness still unproven, owner mapfix3.)
**The "RIGHT NOW" bullet in CLAUDE.md is stale** (its six gates are green). It should come out with the next landing — the train in
progress or ORCH; not pushed alone (main is for landings only).

## Helpers with unlanded work (pushed in the last 30 h), read 10:55 UTC

Reds are from each helper's own newest test run. Main is green now, so every red below is that piece's own problem or a flaky
test (audio and cfclient have been flaky) — each needs a fresh run on today's main before it can ride a train.

| idea (branch) | last save | ahead | stopped note | newest own test run | red tests |
|---|---|---|---|---|---|
| Calm map 4 (calmmap4) | 15 min ago | 6 | yes | none of its own | - |
| Real supply (c-supply) | 1.4 h | 2 | yes | 8d9cac556d | cfclient |
| Map fix 3 (mapfix3) — IN TRAIN 1037 | 1.6 h | 4 | - | 7d2ba3e0ba | audio |
| Calm map (calmmap, leftovers) | 1.7 h | 2 | yes | 0fa0b84f28 | cfclient, tutorial |
| Softer mountains (mtnfix) — IN TRAIN 1037 | 2.6 h | 3 | - | none of its own | - |
| Extras: battle (extras-battle) | 8 h | 1 | - | 60d5e246b5 | grandlive, migrate-down |
| One language: campaign (lang-campaign) | 8 h | 3 | - | 0aee49223e | check (build check fails) |
| Army tokens (armytokens) | 8 h | 6 | yes | 4eeb0c339c | decisions, mpsync, tutorial |
| greenK4 notes | 8 h | 4 | yes | 7f9d5a1c86 | none |
| Seamless flow (seamless-flow) | 8 h | 1 | - | e1c344c7d8 | audio, **smooth-pc** (look change: blocked) |
| Calm map 3 (calmmap3) | 8 h | 2 | - | none of its own | - |
| Extras: command (extras-command) | 8.4 h | 1 | - | 4a7c989031 | audio, cfclient, **smooth-pc** (blocked) |
| Speed S (speedS) | 8.5 h | 3 | yes | cf33e78fb7 | cfclient |
| One language: battle (lang-battle) | 8.5 h | 2 | - | 59e1b4a184 | cfclient |
| Escalation (c-escalation) | 8.6 h | 3 | yes | f2c87c9246 | tutorial |
| greenK3 notes | 8.6 h | 3 | yes | 7f9d5a1c86 | none |
| Extras: story (extras-story) | 8.9 h | 1 | - | d1aef6c3d2 | cfclient, controls |
| Proxy warfare leftovers (c-proxy-warfare) | 8.9 h | 1 | yes | landed piece 7ba01be | - |
| One language spec (onelanguage) | 9 h | 5 | - | none | - |
| Stockpiles (c-stockpiles) | 9.6 h | 4 | yes | 1e83008733 | audio, cfclient, tutorial |
| Voices V (voicesV) | 15 h | 3 | yes | d19894f02f | cfclient, audio (old main) |
| Polish P2 (polishP2) | 17 h | 1 | - | 1e53c43f14 | measured on old red main |
| greenK | 19 h | 1 | yes | none | - |
| Safety H (safetyH) | 21 h | 3 | yes | 5dfef609ec | measured on old red main |
| Proxy (c-proxy, old) | 21 h | 1 | yes | none | - |
| Dashboard J (dashJ) | 21 h | 2 | yes | 673e996495 | measured on old red main |
| greenK-qfeel / greenK-snap | 21 h | 9 / 6 | - | none | - |
| Win fix (winfix) | 22 h | 1 | - | effcba30a0 | measured on old red main |
| Grand snapshot loop, Sound, Autosave loop, Leaders C, Dashboard I, Speed D | 25–30 h | 1–3 | some | old or none | - |

Fully landed (0 ahead): q-feel, q-look, q-american, loop-playtest, c-war-support, q-words, q-ai.

## Locks with nothing saved (90+ min, no work branch)

- **Real war** (`taken/realwar`, 9 h) — nothing saved.
- **Seamless HUD** (`taken/seamless-hud`, 9 h) — nothing saved.
- **Army standards** (`taken/army-standards`, 9.5 h) — only a concept sheet saved on the lock itself, no work branch.

## For the next conductor run

1. If train 1037 has not landed and is older than 110 min, pick it up: gate it, land if clean, and remove the stale "RIGHT NOW" bullet.
2. Candidates worth a fresh gate on today's main (own reds were only flaky audio/cfclient): c-supply, lang-battle, speedS, calmmap4, calmmap3.
3. Not ready: lang-campaign (build check), armytokens (decisions/mpsync/tutorial), seamless-flow and extras-command (smooth-pc), extras-battle, extras-story, c-escalation, c-stockpiles (tutorial).
