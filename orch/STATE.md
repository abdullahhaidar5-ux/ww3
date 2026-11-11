# STATE — conductor run 3 on 2026-11-11, 12:50 UTC onward (third train being tested)

**Main = ac59908f** (train 2). Main's own test run after that landing is RED on two tests: `gate/tutorial` (TUTORIAL FAIL (1)) and
`gate/cfclient` (its text says PASS but the status is failure). The same commit was all green on its train run an hour earlier, so both
look flaky, but nobody owns them right now. smooth-pc / smooth-mp / grandsmooth are green on main. The "RIGHT NOW" bullet in CLAUDE.md stays
until main's own run is fully green.

**Train 3 = `train/20261111-1252`, head e0e78614, test run `gate/e0e7861459`** (started 13:14 UTC):
1. Calm map 4 (orch/calmmap4): close view shows only capital name plates, guard against look-alike neighbour colours — e9c4eb1d
2. Calm map flag follow-up (orch/calmmap 1a0865f0): army flags wave only in the close view or on the selected army — 36ff6c59
3. Campaign panels + Readability (orch/polishP2): one frame, close X, Esc; text size 100/115/130 %; colour-blind set — 9f01f2ce
   (one conflict in src/13j-grandmilui.js: kept the shared frame header from the panels piece AND the new Stockpiles tab from main)
Local: build + --check OK after every merge. The sandbox needs more than 10 minutes for one smoke run, so smoke / decisions / grandtest
were run once on the finished train instead of after every merge (results at the bottom).

**Looked at and NOT taken this run:**
- Window fix (orch/winfix): already on main (the `wallAt` code is there); the branch is only an older copy.
- Stuck units + controls feel + campaign safety copies (orch/greenK-snap, test run gate/1bb5e66377): changes the simulation, and its own run
  shows `mpsync` red (client view diverged from the host in 2/11 checks) plus audio. Needs a fresh run on today's main before it can ride.
- End screen damage dealt (orch/dashJ): own run red on mpsync, migrate-dual, audio — same reason.
- Report a problem form + nightly balance report (orch/safetyH): own run red on audio; it also adds a new scheduled GitHub workflow, which the conductor does not start.
- Frame-time governor (orch/speedS): its helper wrote "not landed" (p95/p99 worse).
- Army Standards / army tokens (orch/armytokens, gate/6a19d97447): decisions, audio and smooth-pc red.
- Seamless flow, Extras command (smooth-pc red on their own runs), Extras battle, Extras story, One language campaign (build check fails): unchanged for 10 h.
- Sound mix (orch/q-sound), Leaders C, Autosave loop: older than 28 h, no fresh test run.

## Helpers with unlanded work, read 12:55 UTC

| idea (branch) | last save | ahead | newest own test run | red tests |
|---|---|---|---|---|
| Calm map 4 (calmmap4) — IN TRAIN 3 | 2.2 h | 4 | none of its own | - |
| Real supply notes (c-supply) | 3.3 h | 1 (notes only) | - | - |
| Calm map flag follow-up (calmmap) — IN TRAIN 3 | 3.7 h | 2 | 0fa0b84f28 | cfclient, tutorial (same as main) |
| Extras: battle (extras-battle) | 10 h | 1 | 60d5e246b5 | grandlive, migrate-down |
| One language: campaign (lang-campaign) | 10 h | 3 | 0aee49223e | check (build check fails) |
| Army tokens (armytokens) | 10 h | 6 | 4eeb0c339c | decisions, mpsync, tutorial |
| Seamless flow (seamless-flow) | 10 h | 1 | e1c344c7d8 | audio, smooth-pc |
| Extras: command (extras-command) | 10 h | 1 | 4a7c989031 | audio, cfclient, smooth-pc |
| Speed S (speedS) | 10 h | 3 | cf33e78fb7 | cfclient; helper says not to land |
| Extras: story (extras-story) | 11 h | 1 | d1aef6c3d2 | cfclient, controls |
| One language spec (onelanguage) | 11 h | 4 | none | - |
| greenK3 / greenK4 notes | 10 h | 3 / 4 | notes only | - |
| Voices V (voicesV) | 17 h | 3 | d19894f02f | cfclient, audio (old main) |
| Polish P2 (polishP2) — IN TRAIN 3 | 19 h | 1 | 1e53c43f14 | measured on old red main |
| Safety H (safetyH) | 23 h | 3 | 5dfef609ec | audio (+ old main reds) |
| Dashboard J (dashJ) | 23 h | 2 | 673e996495 | mpsync, migrate-dual, audio (+ old main reds) |
| Stuck units + feel + safety copies (greenK-snap / greenK-qfeel / dashI / loop-grand-snap) | 23–29 h | 6 / 9 / 3 / 1 | 1bb5e66377 | mpsync, audio |
| Window fix (winfix) | 24 h | 1 | - | already on main |
| Sound mix (q-sound), Autosave loop, Leaders C, Speed D | 28–32 h | 1–3 | old | - |

## Locks with nothing saved (90+ min, no work branch)

- **Real war** (`taken/realwar`, 11 h) — nothing saved.
- **Seamless HUD** (`taken/seamless-hud`, 11 h) — nothing saved.
- **Army standards** (`taken/army-standards`, 11.5 h) — concept sheet on the lock only; work-in-progress exists only as test branch gate/6a19d97447 (red).
- Nobody has pushed any helper branch in the last 2 hours except this conductor: the builders look stopped again.

RESULT_PLACEHOLDER

---
(previous runs below)

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
