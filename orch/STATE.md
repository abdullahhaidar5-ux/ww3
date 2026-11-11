# STATE — conductor run 5 on 2026-11-11, 16:48–18:40 UTC (TWO trains landed: 3b and 4)

**Main = 068b3146** (train 4 on top of train 3b f80df294). GitHub's test machines work again (setup step fine since about 16:55 UTC).
Live site: Pages built both landings; https://abdullahhaidar5-ux.github.io/ww3/ serves 068b3146 (its campaign bundle grand.b028d95f92.js answers 200).

**Landed, train 3b (f80df294, 17:26 UTC)** — re-run of the same test run 43042843019: 27 of 28 green, only `gate/cfclient` red in the same way as main (text says PASS, status failure):
1. Calm map 4 — close view shows only capital name plates; look-alike neighbour colours guarded
2. Army flags wave only in the close view or on the selected army
3. Campaign panels in one frame (close X, Esc) + text size 100/115/130 % + color-blind set
4. Stockpiles slice 2 — artillery shells and precision bombs
5. War support slice 2 — wartime shortages turn people against the war

**Landed, train 4 (068b3146, 18:36 UTC)** = `train/20261111-1727`, gated as 4cfc6031 (run 43068299089):
6. Real coastlines on the campaign map (orch/mapcoast 98379b21)
7. Real-looking forest on the campaign map (orch/maptrees 6a852b00)
Conflicts: HISTORY (both kept), orch/grandtest.mjs (both checks kept: the forest guard + calm map 4's line), generated files rebuilt.
Local: build + --check OK after each merge, GRANDTEST PASS, DECISIONS PASS, SMOKE PASS (510 s).
GitHub: first pass 26 green, red `gate/audio` ("second battle: battle music again") and `gate/cfclient` (as main). Neither piece touches sound;
the ONE re-gate (re-run of the failed jobs) gave AUDIO PASS. smooth-pc / smooth-mp / grandsmooth green. cfclient stays red as on main.
Note: the landing commit 068b3146 also carries 22 refreshed test pictures under orch/shots/ (audit, grand2, grand3) from this run's local test — pictures only, no game change; not intended, harmless.

**Flaky tests, nobody owns them:** main's own run on f80df294 came out RED on `gate/mpsync` (client view diverged 3/11) and `gate/tutorial`
(TUTORIAL FAIL (1)), although the very same commit was green on both one hour earlier in the train run. Also flaky today: `gate/audio`
(second-battle music), `gate/cfclient` (says PASS, reports failure — red on every run). So the "RIGHT NOW" bullet in CLAUDE.md stays.
Someone should own these four; they make every landing a coin toss.

## Helpers with unlanded work, read 16:55 UTC (nobody saved anything new since 16:00 UTC)

| idea (branch) | last save | newest own test run | red tests / note |
|---|---|---|---|
| Real supply notes (c-supply) | 9 h | - | notes only |
| Extras: battle (extras-battle) | 16 h | 60d5e246b5 | grandlive, migrate-down |
| One language: campaign (lang-campaign) | 16 h | 0aee49223e | check (build check fails) |
| Army tokens (armytokens) | 16 h | 4eeb0c339c | decisions, mpsync, tutorial; handoff written |
| Seamless flow (seamless-flow) | 16 h | e1c344c7d8 | audio, smooth-pc |
| Extras: command (extras-command) | 16 h | 4a7c989031 | audio, cfclient, smooth-pc |
| Speed S (speedS) | 16 h | cf33e78fb7 | helper says not to land |
| Extras: story (extras-story) | 17 h | d1aef6c3d2 | cfclient, controls |
| Proxy warfare (c-proxy-warfare / c-proxy) | 17 h / 29 h | - | handoff written, 1 commit each, never gated |
| One language spec (onelanguage) | 17 h | none | - |
| greenK3 / greenK4 / greenK notes | 16–26 h | notes only | - |
| Voices V (voicesV) | 23 h | d19894f02f | cfclient, audio (old main) |
| Safety H (safetyH) | 29 h | 5dfef609ec | audio (+ old main reds) |
| Dashboard J (dashJ) | 29 h | 673e996495 | mpsync, migrate-dual, audio |
| Stuck units + feel + safety copies (greenK-snap / greenK-qfeel / dashI / loop-grand-snap) | 29–35 h | 1bb5e66377 | mpsync, audio |
| Sound mix (q-sound), Autosave loop, Leaders C, Speed D | 34–38 h | old | - |

Since audio / mpsync / tutorial / cfclient are flaky, several of the "red" rows above may be fine: seamless flow and extras-command are
really blocked only by smooth-pc; extras-story by controls; extras-battle by grandlive / migrate-down; army tokens by decisions. A fresh
run on current main would tell (they are 16 h behind main and will need a merge).

## Locks with nothing saved (90+ min, no work branch)

- **Map scale** (`taken/mapscale`, 5 h) — nothing saved. NEW on this list.
- **Real war** (`taken/realwar`, 15 h) — nothing saved.
- **Seamless HUD** (`taken/seamless-hud`, 15 h) — nothing saved.
- **Army standards** (`taken/army-standards`, 15.5 h) — concept sheet on the lock only; test branch gate/6a19d97447 (red).
- **One language: battle** (`taken/lang-battle`, 15 h) — nothing saved.
- Nobody has pushed work in the last 100 minutes; stockpiles 2, war support 2, coastlines and forest helpers all stopped waiting for a verdict — all four are now on main.

**For the next conductor run:** nothing is waiting in a finished state. `train/20261111-1727` and `train/20261111-1452` are both IN main
(finished). Next candidates need a merge with current main and a fresh test run first: seamless flow, extras (battle / command / story),
army tokens, stuck units + feel (greenK-qfeel stack), proxy warfare.

---
(previous runs below)

# STATE — conductor run 4 on 2026-11-11, 14:50–16:30 UTC (train 3b built with 5 pieces, NOT landed: GitHub test machines could not set up, no verdict)

**Main = ac59908f** (train 2, unchanged). Main's own run: red on `gate/tutorial` and `gate/cfclient` (both look flaky), smooth gates green.

**GitHub test outage since about 13:50 UTC:** every test job dies in its setup step "Tools" before any test starts —
`apt` on GitHub's runners cannot resolve `security.ubuntu.com` (needed by `playwright install --with-deps`). It hit the two campaign
helpers' runs (gate/e5de367f7b, gate/4ca54aa2b0, gate/a5138b78f9: zero results), three jobs of train 3's second run, and this run's train.
No test is red; there is simply no verdict. Nothing may land without one.

**Train 3b = `train/20261111-1452` (f80df294), 5 pieces on main ac59908f:**
1. Calm map 4 (orch/calmmap4): close view shows only capital name plates; guard against look-alike neighbour colours
2. Calm map flag follow-up (orch/calmmap): army flags wave only in the close view or on the selected army
3. Campaign panels + Readability (orch/polishP2): one frame, close X, Esc; text size 100/115/130 %; color-blind set
   (+ American spelling fix, + its settings check accepts both spellings)
4. Campaign stockpiles slice 2 (orch/c-stockpiles2 a5138b78): artillery shells and precision bombs — merge 2d of train
5. Campaign war support slice 2 (orch/c-war-support2 6453197d): wartime shortages turn people against the war
Conflicts: only HISTORY / QUEUE (kept both sides) and generated files (rebuilt); 8 screenshot files that both campaign slices re-shot kept the stockpiles copy.
Local on f80df294: build + --check OK after each merge, SMOKE PASS (477 s), DECISIONS PASS. QUEUE ticks and HISTORY lines are inside the train.
GitHub run 43042843019 on f80df294: see "Result" below.

**Not taken this run:**
- Real coastlines (orch/mapcoast, 14:55 UTC) and Real-looking forest (orch/maptrees, 15:05 UTC): brand new look changes, helpers still working, no test run of their own yet. Both edit src/13e-grand3d.js like calm map 4 — they will need a merge after train 3b lands.
- Everything listed under "Looked at and NOT taken" in run 3 below is unchanged (stuck units + feel, end screen damage, report-a-problem form, army tokens, seamless flow, extras, one language, sound mix, leaders C, autosave loop).

## Helpers with unlanded work, read 14:55 UTC

| idea (branch) | last save | ahead | newest own test run | red tests |
|---|---|---|---|---|
| Real-looking forest on the campaign map (maptrees) | 1 h | 2+ | b3aa92bf12 | no verdict (GitHub setup outage) |
| Stockpiles slice 2 (c-stockpiles2) — IN TRAIN 3b, handoff written | 0.1 h | 4 | a5138b78f9 | no verdict (GitHub setup outage) |
| War support slice 2 (c-war-support2) — IN TRAIN 3b, handoff written | 0.1 h | 2 | 4ca54aa2b0 | no verdict (GitHub setup outage) |
| Real coastlines (mapcoast) | 1 h | 2+ | 98379b2124 | no verdict (GitHub setup outage) |
| Calm map 4 (calmmap4) — IN TRAIN 3b | 4.3 h | 4 | via train 3 | green there |
| Real supply notes (c-supply) | 5.4 h | 1 (notes only) | - | - |
| Calm map flag follow-up (calmmap) — IN TRAIN 3b | 5.7 h | 2 | 0fa0b84f28 | cfclient, tutorial (same as main) |
| Extras: battle (extras-battle) | 12 h | 1 | 60d5e246b5 | grandlive, migrate-down |
| One language: campaign (lang-campaign) | 12 h | 3 | 0aee49223e | check (build check fails) |
| Army tokens (armytokens) | 12 h | 6 | 4eeb0c339c | decisions, mpsync, tutorial |
| Seamless flow (seamless-flow) | 12 h | 1 | e1c344c7d8 | audio, smooth-pc |
| Extras: command (extras-command) | 12 h | 1 | 4a7c989031 | audio, cfclient, smooth-pc |
| Speed S (speedS) | 12.5 h | 3 | cf33e78fb7 | cfclient; helper says not to land |
| Extras: story (extras-story) | 13 h | 1 | d1aef6c3d2 | cfclient, controls |
| One language spec (onelanguage) | 13 h | 4 | none | - |
| greenK3 / greenK4 notes | 12 h | 3 / 4 | notes only | - |
| Voices V (voicesV) | 19 h | 3 | d19894f02f | cfclient, audio (old main) |
| Polish P2 (polishP2) — IN TRAIN 3b | 21 h | 1 | via train 3 | save (fixed in train, unproven) |
| Safety H (safetyH) | 25 h | 3 | 5dfef609ec | audio (+ old main reds) |
| Dashboard J (dashJ) | 25 h | 2 | 673e996495 | mpsync, migrate-dual, audio |
| Stuck units + feel + safety copies (greenK-snap / greenK-qfeel / dashI / loop-grand-snap) | 25–31 h | 6 / 9 / 3 / 1 | 1bb5e66377 | mpsync, audio |
| Window fix (winfix) | 26 h | 1 | - | already on main |
| Sound mix (q-sound), Autosave loop, Leaders C, Speed D | 30–34 h | 1–3 | old | - |

## Locks with nothing saved (90+ min, no work branch)

- **Real war** (`taken/realwar`, 13 h) — nothing saved.
- **Seamless HUD** (`taken/seamless-hud`, 13 h) — nothing saved.
- **Army standards** (`taken/army-standards`, 13.5 h) — concept sheet on the lock only; work exists only as test branch gate/6a19d97447 (red).
- **One language: battle** (`taken/lang-battle`, 13 h) — nothing saved.
- Active in the last hour: stockpiles 2, war support 2 (both stopped with a handoff: waiting for a test verdict), real coastlines, real-looking forest.

## Result of this run

**NOTHING LANDED — exactly why:** GitHub's runners could not set up from about 13:50 to at least 16:25 UTC. Run 43042843019 on
f80df294 failed 28 of 28 jobs in the setup step "Tools" (apt: "Temporary failure resolving 'security.ubuntu.com'"), the one retry
(re-run of the failed jobs, 16:12 UTC) failed the same way in the first 15 jobs. Not a single test started, so there is no verdict and
no status on the commit. The helpers' own runs (stockpiles 2, war support 2, real coastlines gate/98379b2124, real-looking forest gate/b3aa92bf12) died the same way.
Local on f80df294 (sandbox): build + --check OK, SMOKE PASS, DECISIONS PASS, GRANDTEST PASS. Smoothness cannot be judged here.

**For the next conductor run:** `train/20261111-1452` (f80df294) is FINISHED and waiting, **no conductor is working on it** — ignore the
110-minute rule for it. Main has not moved (ac59908f); if it has, rebase + rebuild. Run `orch/cigate.sh` on it ONCE when GitHub's setup works
again (check first: does any recent "Ship gate" job get past the step "Tools"?). It lands if nothing is red beyond main's tutorial / cfclient
and smooth-pc / smooth-mp / grandsmooth are green. QUEUE ticks and HISTORY lines are already inside. Then look at real coastlines and
real-looking forest (both touch src/13e-grand3d.js, need their own green run first).
**If the outage goes on:** a possible repair for ORCH or Abdullah to decide (the conductor did not touch it): in .github/workflows/gate.yml
step "Tools", retry the browser install and fall back to `npx playwright install chromium` without `--with-deps` when apt is unreachable.
Risk: missing fonts could change what the look tests measure.

---
(previous runs below)

# STATE — conductor run 3 on 2026-11-11, 12:50–14:35 UTC (third train built and tested twice, NOT landed)

**Main = ac59908f** (train 2). Main's own test run after that landing is RED on two tests: `gate/tutorial` (TUTORIAL FAIL (1)) and
`gate/cfclient` (its text says PASS but the status is failure). The same commit was all green on its train run an hour earlier, so both
look flaky, but nobody owns them right now. smooth-pc / smooth-mp / grandsmooth are green on main. The "RIGHT NOW" bullet in CLAUDE.md stays
until main's own run is fully green.

**Train 3, saved as `orch/conductor-train3` (a4ef3e71), ready for the next run — nothing landed this run:**
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

## Result of this run: NOTHING LANDED — exactly why

- Test run 1 (`gate/e0e7861459`, all 28 reported): red = `decisions` (new) + `cfclient` (same odd state as main: text says PASS, status failure).
  decisions failed on the American-spelling guard: the Campaign panels + Readability piece (polishP2, written before that rule) brings the
  text "Colour-blind mode (safe team colours ...)" in src/08n-readable.js line 37. tutorial was GREEN on the train (red on main).
- Fix: ran the repo's own fixer `python3 orch/american.py` (one line changed: Color-blind / colors), rebuilt.
- Test run 2, the one allowed re-test (`gate/767aad5102`, 25 of 28 reported): decisions green, but `save` red (new) and `cfclient` red with a real failure
  this time ("the creator gets no fresh battle state from the server", live Cloudflare server test, has been flaky).
  save failed inside the piece's own check (orch/polishtest.mjs line 152): it counts Settings labels matching /Colour-blind|Text size/, so the
  fixed American label no longer matched. The piece's test and the American-spelling rule contradict each other. Rule says: still red after one re-test, land nothing.
- smooth-pc, smooth-mp and grandsmooth were GREEN on both runs; mpsync, grand, grandlive, tutorial, audio green on both.
- Local on the train: build + --check OK after every merge, SMOKE PASS (639 s), DECISIONS PASS (after the fixer). grandtest was too slow to finish here; `gate/grand` passed twice on GitHub.

**For the next conductor run (should be quick):** `orch/conductor-train3` = main ac59908f + the three pieces + the spelling fix + a one-word change in
orch/polishtest.mjs (/Colou?r-blind|Text size/, accepts both spellings; not tested on GitHub yet). QUEUE ticks and HISTORY lines are already in it.
Rebase it on origin/main if main moved (rebuild), gate ONCE; it lands if save turns green and cfclient is no worse than main's.
If cfclient fails for real again, re-run only that job once (it talks to the live server) before blaming the train.
**`train/20261111-1252` (767aad51, last pushed 13:44 UTC) is FINISHED and abandoned, no conductor is working on it** — this run could not remove it (branch deletes are refused from the sandbox). A run that starts before 15:35 UTC will see it as younger than 110 minutes: it may ignore it and continue with `orch/conductor-train3`.



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
