# STATE — conductor run 21 on 2026-11-13, 00:50–03:40 UTC: **nothing landed** — main is still 77b4ee84 (train 12). Train 13 was one flaky test away, twice

**Helpers are active again** (five saves in the last 80 minutes before this run). Three finished pieces were ready:
| idea (branch, head) | last save at 00:50 | own test run | result |
|---|---|---|---|
| Campaign battles on the map by days (nofightit, c35a3463) — stopped with handoff | 50 min | bba4a87d | 28 of 28 (helper re-ran the flaky sound check) |
| One tidy campaign top bar, Go to list, five alert chips, Nation window in six groups (camphud, 5c0eb06e) — stopped with handoff | 36 min | 5ca98873 | 27 of 28, only flaky `icons` (red on main too); later picture-only commits: 71b00042 smooth-pc + tutorial red, 5c0eb06e green so far — same game code, test machines noisy |
| Infiltrator spy look (spylook, 339f3ab7) — stopped with handoff | 17 min | b426b995 | 27 green, **map sweep never finished** (cancelled at the 45-minute limit) |
| Freeze fix: chunked graphics warm-up on PC (freezefix, bd27648a) — being worked on | 25 min | bd27648a | `smooth-pc` red → skipped (look change with a smooth gate red) |
| EU4 gap audit report (eu4audit, 26ecc7df) | 49 min | — | report only, no game change |
| PLAN-75 / handover documents (plan75, 795163b5) | 77 min | — | documents only |
| Battle report card + front lines (finish-report) — stopped | 23 h | — | needs rework on top of campaign battles |

**Train 13, first test run** (`train/20261113-0051`, commit d459d9b8 = main + spy look + top bar + campaign battles; build, smoke, decisions, grandtest green here):
27 of 28 green — including smooth-pc, smooth-mp, grandsmooth, mpsync, audio, icons, cfclient. **`mapsweep` gave no result**: the job ran 45 minutes and was cancelled by its time limit.
The map sweep only runs when maps / graphics / models change; main and the other pieces skip it. The spy look is the only piece that triggers it, and the same thing
happened on the spy look's own run (b426b995). Normal length is about 10 minutes. Not proven whether the spy look hangs it or the sweep itself has grown too slow since it last really ran — the spy look was taken out.

**Train 13, the one re-run** (`train/20261113-0240`, commit 79efe068 = main + top bar + campaign battles; build, smoke, decisions, grandtest green here): **27 of 28, one red:**
- `mpsync`: "client view diverged from the host in 2/11 live checks, e.g. t=121s: 0/26 visible entities missing, 5 more than 25 m off". Main does not have this red, so by the rule it cannot land.
  The same check failed the same way at t=121s on the spy look's first run (22157387), and passed on campaign battles' own run (bba4a87d), on the top bar's run (5ca98873) and on the first train 13 run (d459d9b8, which contains all of this code) two hours earlier. It looks flaky, but campaign battles do touch simulation files (`src/03-sim.js`, removing the live campaign battle), so the conductor does not wave it through.
Rule: still red after one re-run → land nothing. No test was skipped, weakened or re-run to turn it green.

**Conflicts already solved (kept on `train/20261113-0240`, reusable):** top bar × campaign battles in `src/13c-grandui.js` (new bar kept + `gwuSync` hook in `grandMapRefresh`), `src/13zzz-gpanels.js` (six-group Nation window + battle window / result card entries), `src/08i-hud.js` (both what's-new notes); page and campaign bundle rebuilt (grand.fb001f17e7.js).

**What each piece waits for**
| idea | waits for |
|---|---|
| Campaign battles on the map + one campaign top bar (train 79efe068) | ONE clean test run — only `mpsync` was red. Next conductor run retries the same train. |
| Infiltrator spy look | its helper: find out why the map sweep does not finish with it in (run `node orch/mapsweep.mjs --minutes 1` on GitHub with and without the branch) |
| Freeze fix (78% load hang) | `smooth-pc` green on its own run |

**Needs a decision / an owner (ORCH or Abdullah):** finished work has now been blocked for three conductor runs by a different flaky test each time (smooth-pc tail, smooth-mp latency, grandrt slide check, audio, now mpsync and the map sweep time limit). Nobody owns the flaky tests. Either a helper makes `mpsync` / `mapsweep` reliable, or the conductor rule is changed to allow re-running one single failed test once.

**Main's tests (unchanged):** 77b4ee84: 26 green; `audio`, `icons`, `cfclient` red (flaky, no owner); smooth gates green.
**Live site:** nothing landed, so https://abdullahhaidar5-ux.github.io/ww3/ still serves main 77b4ee84.

## Locks with nothing saved (90+ min, no work branch of that name)
- **Real war** (`taken/realwar`), **Seamless HUD** (`taken/seamless-hud`), **Army standards** (`taken/army-standards`) — 2 days old, stale; **Real campaign supply** (`taken/c-real-supply`, 40 h) and **finish-tokens** (28 h) — old, their work landed or lives under another branch name. `taken/spylook2` and `taken/freezefix2` (12 h) save to `orch/spylook` / `orch/freezefix`. 37 locks in all, no new ones.

---
(previous runs below)

# STATE — conductor run 22 on 2026-11-13, 02:48–03:00 UTC: **state check only, no train** — main is still 77b4ee84 (train 12)

Another conductor run is still working: its train `train/20261113-0240` (79efe068 = main + one campaign top bar + campaign battles on the map) was pushed 8 minutes before this run and is on its test run (4 results in, all green so far). Rule: a train younger than 110 minutes = look only. That run decides the landing and writes its own entry.
Its earlier train `train/20261113-0051` (d459d9b8, same two pieces + the spy look) shows 27 green, none red, 3 results never arrived; it was not landed.

| idea (branch) | last save | ahead of main | stopped with handoff | newest own test run | result |
|---|---|---|---|---|---|
| Kheibar freeze fix / warm-up (freezefix) | 14 min | 11 | yes (older note; work resumed) | b8b41216 | 24 green, `superfreeze` red, rest still running. Earlier tries tonight: 20168d1f `smooth-pc` + `superfreeze` red; c8e1cd75 and bd27648a `smooth-pc`, `superfreeze`, `cfclient` red — not ready (smooth gate red) |
| PLAN-75 documents (plan75) | 18 min | 7 | no | — | documents only |
| Battle map list for Battle setup + online lobby (battlemaps) | 30 min | 3 | no | 6a19dbfb | just started: 2 green, rest running |
| Campaign map: armies as shields, fleets as hulls, air groups as wings (mapshapes) | 33 min | 1 | no | — | no test run yet |
| Infiltrator spy look (spylook) | 2 h 15 min | 7 | yes | b426b995 | 27 green, none red (3 results missing) — finished, waiting |
| One campaign top bar, Go to list, alert chips, Nation window (camphud) | 2 h 35 min | 7 | yes | 5c0eb06e | 28 green — on the running train |
| EU4 gap audit report (eu4audit) | 2 h 45 min | 1 | no | — | report only, no game files |
| Campaign battles on the map by days (nofightit; warpeace points at the same commit) | 2 h 50 min | 12 | yes | bba4a87d | 28 green — on the running train |
| War and peace (warpeace) | 2 h 50 min | 12 (nothing of its own yet) | no | — | lock 2 h 50 min old, branch holds only the campaign-battles work — **nothing of its own saved** |
| Battle report card + front lines (finish-report) | 25 h | 8 | yes | — | stopped; needs rework on campaign battles |
| Trees on the campaign map (maptrees) | 31 h | 2 | yes | — | stopped |
| Campaign real supply (c-supply) | 41 h | 1 | yes | — | notes only |

**Main 77b4ee84:** 26 green, 4 red (`main`, `cfclient`, `icons`, `audio` — the known flaky ones; smooth gates green).
**Locks with nothing saved (90+ min, no work branch of that name):** Freeze fix 2 (`taken/freezefix2`, 13.5 h — work is being saved on `freezefix` instead, so fine) · Spy look 2 (`taken/spylook2`, 13.5 h — saved on `spylook`, fine) · Finish tokens (30 h) · Campaign real supply (`c-real-supply`, 41 h) · Real war, Seamless HUD, Army standards (2+ days) — stale.
**War and peace** is the one to watch: started 2 h 50 min ago, no commit of its own yet.
**Live site:** nothing landed in this run; https://abdullahhaidar5-ux.github.io/ww3/ serves main 77b4ee84 unless the running conductor lands train 13.

---

# STATE — conductor run 20 on 2026-11-12, 22:45–23:00 UTC: **state check only, no train** — main is still 77b4ee84 (train 12)

Run 19's second train (`train/20261112-2153`) was pushed 58 minutes before this run and is not on main, so by the conductor rule (a train younger than 110 minutes = do not start another) this run only looked.
**Nothing has changed since run 19 (27 minutes earlier):** no new save, no new test run, no new lock.
| idea (branch) | last save | ahead of main | newest own test run | result |
|---|---|---|---|---|
| Campaign battles on the map by days (nofightit, 0c2f110d) — stopped with handoff | 2 h 35 min | 10 | bba4a87d | 27 of 28 (only flaky `audio`); on train df53290b: 25 of 28 (`smooth-mp`, `grandlive`, `audio` red — final, all 28 in) |
| Infiltrator spy look (spylook, 978336f4) — stopped with handoff | 2 h 35 min | 5 | 22157387 | 25 of 28 (`cfclient`, `mpsync`, mapsweep) |
| PLAN-75 documents (plan75) | 10 h | 3 | — | documents only |
| Kheibar freeze fix (freezefix) — stopped | 14 h | 5 | 4e92b695 | smooth-pc + audio red |
| Battle report card + front lines (finish-report) — stopped | 21 h | 8 | — | needs rework on campaign battles |
Main 77b4ee84: 26 green, `audio`, `icons`, `cfclient` red (flaky, no owner). Locks: 34, newest 9.5 h old (nofightit, spylook2 — both have work branches); stale without any saved work: Real war, Seamless HUD, Army standards.
**Next run (2 h):** campaign battles alone on a fresh test run, then the spy look on its own run — as planned in run 19 below.

---

# STATE — conductor run 19 on 2026-11-12, 20:50–22:30 UTC: **nothing landed** — main is still 77b4ee84 (train 12). Two finished pieces tried, test runs red twice

**Helpers are back:** two finished pieces arrived with handoff notes ("ready for the conductor") around 20:15 UTC.
| idea (branch) | own test run | result |
|---|---|---|
| Campaign battles fought on the map by days, no real-time campaign battle (nofightit, head 0c2f110d) — Abdullah's decision 2026-11-11 23:57 | bba4a87d | 27 of 28; only the flaky `audio` red |
| Infiltrator: one plain-clothes spy look (spylook, head 978336f4) | 22157387 | 25 of 28; `cfclient` (flaky, red on main too), `mpsync` red once (main does not have it), mapsweep unfinished |

**Train 13, first test run** (`train/20261112-2052`, commit e5e8b5c0 = main + spylook + nofightit; both merged clean, build + smoke + grandtest green here):
23 results in, **`smooth-pc` red** — slowest 1% of frames 683 ms (allowed 614), worst-1% FPS 1.44 (allowed 1.7), failed twice inside the job. Everything else that finished was green (mpsync too).
Culprit guess: the spy look (the only piece that touches how battle soldiers are drawn; its branch also swaps box figures for real models when they arrive) — taken out.

**Train 13, the one re-run** (`train/20261112-2153`, commit df53290b = main + nofightit only; same game files as nofightit's own tested commit): **25 of 28, three red:**
- `smooth-mp`: order latency p95 319 ms (baseline 111, allowed 215) — smooth gate red, so it cannot land. smooth-pc and grandsmooth were green this time.
- `grandlive`: `GRANDRT FAIL` "marching army does not slide along its road as days pass" — the army moved 0.91 map units between two samples, the check wants more than 1 (orch/grandrt.mjs line 73). The same code passed this check on bba4a87d and on e5e8b5c0 an hour earlier, and passes in the sandbox (moved 1.7). Looks timing-dependent, not a rule fault.
- `audio`: "second battle: battle music again" — same as on main.
Rule: still red after one re-run → land nothing. No test was skipped or re-run to turn it green.

**Reading:** the same campaign-battles code has now had three runs: 27/28, then (with the spy look) smooth-pc red, then smooth-mp + grandrt red. The smooth numbers that failed are
"slowest frames" and "network latency" on the test machine, different ones each time, on code that does not touch battles' frame loop — the test machines look noisy this evening.
So the spy look may be innocent of the smooth-pc red; it was not proven either way.
**What each piece waits for:** one clean test run. Next conductor run (2 h) will try campaign battles alone again, then the spy look on its own run.
For the helpers / ORCH: `grandrt` slide check margin is thin (0.9 vs 1.0 over 4 days) — the campaign-battles helper should make that check robust (sample further apart), not the conductor.

**Conductor slip, fixed before anything was tested for landing:** my two "history marked" commits swept in screenshots that a local test run had rewritten (`git commit -a`); the second train has a follow-up commit df53290b that puts them back, so the tested tree differs from nofightit only by one HISTORY line. Run 43314750297 on the bad commit was cancelled. Nothing of this reached main.

**Main's tests (unchanged):** 77b4ee84: 25 of 28 on its automatic run (`audio`, `icons`, `cfclient` — flaky; smooth gates green). Status on main reads RED. Nobody owns the flaky tests.
**Live site:** nothing landed, so https://abdullahhaidar5-ux.github.io/ww3/ still serves main 77b4ee84 (verified byte for byte in run 18; main has not moved).

## Finished and waiting
| idea (branch) | waits for |
|---|---|
| Campaign battles on the map by days (nofightit) — helper stopped with handoff | one clean test run (conductor retries next run); open: a garrison card labelled "undefined", gate.yml comments |
| Infiltrator spy look (spylook) — helper stopped with handoff | its own clean run incl. smooth-pc and mpsync (conductor retries after campaign battles) |
| Kheibar freeze fix (freezefix) — stopped | smooth-pc + audio red on its run 4e92b695; head untested; nobody working on it |

## In progress / not ready (unchanged since run 18)
PLAN-75 documents (plan75, 8 h, documents only) · battle report card + front lines (finish-report, 19 h, stopped; its card was written for the old live battle — needs rework on top of campaign battles) ·
trees on the campaign map (maptrees, 25 h, stopped) · campaign real supply (c-supply, 35 h, notes only).

## Not started by anyone
- **Fight-it hang at "PREPARING GRAPHICS… 78%"** on Abdullah's laptop — goes away for the campaign once campaign battles land (no live campaign battle any more); still open for Conquest/Battle if it happens there.
- **Flaky tests** (`audio`, `icons`, `cfclient`, `mpsync`, `grandrt` slide check, smooth tails on slow test machines): no owner.

## Locks with nothing saved (90+ min, no work branch of that name)
- **Real war** (`taken/realwar`), **Seamless HUD** (`taken/seamless-hud`), **Army standards** (`taken/army-standards`) — 2+ days old, stale. 34 locks in all, newest 9 h old; no new ones.

---
(previous runs below)

# STATE — conductor run 18 on 2026-11-12, 18:45–19:00 UTC: **nothing to land** — main is still 77b4ee84 (train 12)

**No train was built: nothing has changed since runs 16 and 17.** No helper has saved game work for 9.5 hours; no new `gate/*` test run (newest is main's own, 13:12 UTC),
no new lock (newest 01:01 UTC), no new work branch. Newest saves: PLAN-75 documents (plan75, 6 h 20 min, documents only), campaign battles (nofightit, 9 h 40 min),
freeze fix (freezefix, 10 h, stopped with handoff).
Candidates by the rule (own test run in the last 8 h, not on main): only the old train 11 commit d1253a70 — its content landed in trains 11b/12 except the
**Kheibar freeze fix**, whose run there has `smooth-pc` red (+ `audio`), so it is skipped (look change with a smooth gate red).
**Campaign battles on the map by days** (nofightit, run 6cdd9f53, 28 of 28 on an old main) is now older than 8 h and unchanged: 52 commits behind main,
12 conflicts in 60 files, needs the army-token odds pill pointed at the new battle odds (run 15 below) — a helper's job, not conflict resolution.
All other parked branches: unchanged (table in run 16 below still holds).

**Main's tests (unchanged):** 77b4ee84 passed 28 of 28 at 13:35 UTC, automatic re-run 25 of 28 at 14:30 UTC (`audio`, `icons`, `cfclient` — the known flaky tests;
smooth-pc, smooth-mp, grandsmooth green). Status on main reads RED. Nobody owns the flaky tests.

**Live site:** https://abdullahhaidar5-ux.github.io/ww3/ serves main 77b4ee84 (page checked byte for byte at 18:51 UTC).

## Finished and waiting
| idea (branch) | own test run | result | waits for |
|---|---|---|---|
| Campaign battles on the map by days (nofightit) | 6cdd9f53 | all green, on an old main (52 commits behind) | a helper (nobody active): merge main + token odds, one test run |
| Kheibar freeze fix (freezefix) — helper stopped (handoff) | 4e92b695 | smooth-pc + audio red; head c18b9467 untested | a fix for the slow-frame tail, two clean smooth-pc runs |

## In progress / not ready
| idea (branch) | last save | state |
|---|---|---|
| PLAN-75 + handover note for a fresh ORCH (plan75) | 6 h 20 min | documents only |
| Battle report card + front lines (finish-report) — stopped (handoff) | 17 h | tutorial + migrate-down red; nobody re-running |
| Infiltrators look like spies (spylook) | 16.5 h | cfclient + migrate-down red, far behind main |
| Trees on the campaign map (maptrees) — stopped (handoff) | 23 h | needs a fresh run on today's main |
| Campaign real supply (c-supply) — stopped (handoff) | 33 h | parked, notes only ahead of main |

**Nobody has saved any game work in the last 9.5 hours. No helper appears to be building.** Open queue items are untaken.

## Not started by anyone
- **Fight-it battle hangs at "PREPARING GRAPHICS… 78%"** on Abdullah's Windows laptop (suggested fix in `orch/HANDOFF-freezefix.md` on orch/freezefix).
- **Flaky tests** (`cfclient` group, `tutorial`, `mpsync`, `migrate*`, `audio`, `icons`): no owner; main's own status is red because of them.

## Locks with nothing saved (90+ min, no work branch of that name)
- **Real war** (`taken/realwar`), **Seamless HUD** (`taken/seamless-hud`), **Army standards** (`taken/army-standards`) — 2+ days old, stale. No new locks (33 in all, newest 01:01 UTC).

---
(previous runs below)

# STATE — conductor run 17 on 2026-11-12, 16:49–17:05 UTC: **nothing to land** — main is still 77b4ee84 (train 12)

**No train was built: nothing has changed since run 16.** No helper has saved game work for 7.5 hours; no new `gate/*` test run, no new lock, no new work branch.
Newest saves: PLAN-75 documents (plan75, 4 h 20 min, documents only), campaign battles (nofightit, 7 h 40 min), freeze fix (freezefix, 8 h, stopped with handoff).
Candidates by the rule (own test run in the last 8 h, not on main): only **campaign battles on the map by days** (nofightit, run 6cdd9f53, 28 of 28 on an old main).
Main and that branch are both unchanged since runs 15/16, where the trial merge gave 12 conflicts in 60 files and needs real work
(point the army-token odds pill at the new battle odds — see run 15 below). That is the helper's job, not conflict resolution, so it was not retried.
All other parked branches: unchanged since run 16 (table in run 16 below still holds).

**Main's tests (unchanged):** 77b4ee84 passed 28 of 28 at 13:35 UTC, automatic re-run 25 of 28 at 14:30 UTC (`audio`, `icons`, `cfclient` — the known flaky tests;
smooth-pc, smooth-mp, grandsmooth green). Status on main reads RED. Nobody owns the flaky tests. Battle servers = main (servers-live tree identical).

**Live site:** https://abdullahhaidar5-ux.github.io/ww3/ serves main 77b4ee84 (page checked byte for byte at 16:55 UTC).

## Finished and waiting
| idea (branch) | own test run | result | waits for |
|---|---|---|---|
| Campaign battles on the map by days (nofightit) | 6cdd9f53 | all green, on an old main (52 commits behind) | a helper (nobody active): merge main + token odds, one test run |
| Kheibar freeze fix (freezefix) — helper stopped (handoff) | 4e92b695 | smooth-pc + audio red; head c18b9467 untested | a fix for the slow-frame tail, two clean smooth-pc runs |

## In progress / not ready
| idea (branch) | last save | state |
|---|---|---|
| PLAN-75 + handover note for a fresh ORCH (plan75) | 4 h 20 min | documents only |
| Battle report card + front lines (finish-report) — stopped (handoff) | 15 h | tutorial + migrate-down red; nobody re-running |
| Infiltrators look like spies (spylook) | 14.5 h | cfclient + migrate-down red, far behind main |
| Trees on the campaign map (maptrees) — stopped (handoff) | 21 h | needs a fresh run on today's main |
| Campaign real supply (c-supply) — stopped (handoff) | 31 h | parked, notes only ahead of main |

**Nobody has saved any game work in the last 7.5 hours. No helper appears to be building.** 20 queue items are open and untaken.

## Not started by anyone
- **Fight-it battle hangs at "PREPARING GRAPHICS… 78%"** on Abdullah's Windows laptop (suggested fix in `orch/HANDOFF-freezefix.md` on orch/freezefix).
- **Flaky tests** (`cfclient` group, `tutorial`, `mpsync`, `migrate*`, `audio`, `icons`): no owner; main's own status is red because of them.

## Locks with nothing saved (90+ min, no work branch of that name)
- **Real war** (`taken/realwar`), **Seamless HUD** (`taken/seamless-hud`), **Army standards** (`taken/army-standards`) — 2 days old, stale. No new locks.
- `taken/c-real-supply` saved as c-supply; `taken/finish-tokens` saved as armytokens2 (landed) — not lost.

---
(previous runs below)

# STATE — conductor run 16 on 2026-11-12, 14:45–15:10 UTC: **nothing to land** — main is still 77b4ee84 (train 12)

**No train was built this run: no helper has saved any game work since run 15.** Newest saves: PLAN-75 documents (plan75, 2 h 20 min ago, documents only),
campaign battles (nofightit, 5 h 40 min), freeze fix (freezefix, 6 h), Conquest/Battle clean-up (battleclean, landed). No new `gate/*` test run, no new lock.
All candidates were checked again against today's main (trial merge, nothing pushed):
| idea (branch) | trial merge with main | why not on this train |
|---|---|---|
| Campaign battles on the map by days (nofightit, own run 6cdd9f53 28 of 28) | 12 conflicts in 60 files | unchanged since run 15: helper must merge today's main and point the army-token odds pill at the new battle odds (details in run 15 below) |
| Kheibar freeze fix (freezefix) | 1 conflict | own run 4e92b695 has smooth-pc + audio red; head c18b9467 never tested; helper stopped |
| Window fix (winfix) | - | already on main (`wallAt`) |
| Proxy warfare, real supply, CPU speed (c-proxy-warfare, c-supply, speedD) | clean | only handoff notes ahead of main — no game change to land (docs-only never goes to main) |
| Battle report card (finish-report), spies (spylook), map trees (maptrees), q-sound, dashJ, safetyH, greenK-snap / -qfeel, seamless-flow, leadersC | 2–10 conflicts each | old runs red or 1–2 days stale, helpers gone |

**Main's tests: the landed commit 77b4ee84 passed 28 of 28 at 13:35 UTC (the conductor's run), then the automatic second run after the push
came back 25 of 28 at 14:30 UTC:** `audio` ("second battle: battle music again"), `icons` (timeout), `cfclient` ("pages did not get back into the battle after the
server restarted", 389 s). Same code, 40 minutes apart, so this reads as the known flaky tests on a slow test machine, not a new fault — but the
status on main now says RED. Battle servers were already updated to this commit (servers-live = main, done after the first green run).
Nobody owns the flaky tests (see below); the next train will be compared against "main has audio / icons / cfclient red".

**Live site:** https://abdullahhaidar5-ux.github.io/ww3/ serves main 77b4ee84 (page checked byte for byte at 15:05 UTC).

## Finished and waiting
| idea (branch) | own test run | result | waits for |
|---|---|---|---|
| Campaign battles on the map by days (nofightit) | 6cdd9f53 | all green, on an old main | its helper (nobody active): merge main + token odds, one test run |
| Kheibar freeze fix (freezefix) — helper stopped (handoff) | 4e92b695 | smooth-pc + audio red | a fix for the slow-frame tail, two clean smooth-pc runs |

## In progress / not ready
| idea (branch) | last save | state |
|---|---|---|
| PLAN-75 + handover note for a fresh ORCH (plan75) | 2 h 20 min | documents only |
| Battle report card + front lines (finish-report) — stopped (handoff) | 13 h | tutorial + migrate-down red; nobody re-running |
| Infiltrators look like spies (spylook) | 12.5 h | cfclient + migrate-down red, far behind main |
| Trees on the campaign map (maptrees) — stopped (handoff) | 19 h | needs a fresh run on today's main |
| Campaign real supply (c-supply) — stopped (handoff) | 29 h | parked, notes only ahead of main |

**Nobody has saved any game work in the last 5.5 hours. No helper appears to be building.**

## Not started by anyone
- **Fight-it battle hangs at "PREPARING GRAPHICS… 78%"** on Abdullah's Windows laptop (suggested fix in `orch/HANDOFF-freezefix.md` on orch/freezefix).
- **Flaky tests** (`cfclient` group, `tutorial`, `mpsync`, `migrate*`, `audio`, now `icons`): no owner; they have now turned main's own status red.

## Locks with nothing saved (90+ min, no work branch of that name)
- **Real war** (`taken/realwar`), **Seamless HUD** (`taken/seamless-hud`), **Army standards** (`taken/army-standards`) — 37 h old, stale. No new locks.

---
(previous runs below)

# STATE — conductor run 15 on 2026-11-12, 12:50–13:55 UTC: **train 12 LANDED** — main = 77b4ee84

**Went live (1 piece, 28 of 28 tests green on the landed commit, same as main had):** Conquest starts with a full base and $10,000 · Battle has no supply lines or dotted roads · Conquest roads green (yours) / red (enemy) / gray (neutral) · rally flag goes away when you click away (orch/battleclean, merge 17babd26).
Local: build + --check, SMOKE PASS, DECISIONS PASS. Deviation, stated plainly: the local campaign test was still running (slow sandbox) when GitHub's `gate/grand` came back green, so it was stopped and the GitHub result used.
Live site: https://abdullahhaidar5-ux.github.io/ww3/ served the landed page 4 minutes after the push (page checked byte for byte).
Pictures: `orch/concepts/battleclean/` (cq-start-RS, cq-minimap-roads, cq-ground-roads, battle-minimap-BEFORE / -AFTER, rally-selected / -clicked-away).
Open questions from that helper's handoff for Abdullah: ammo refill circles were kept in Battle; nations without an air force (RS, DW …) start without an Airfield; no player-built power building exists.

**Left out: campaign battles fought on the map by days (orch/nofightit, own run 6cdd9f53 28 of 28, but 43 commits behind main).**
It does not fit on today's main without real work, so the merge was aborted (not a conductor job):
- It deletes the old auto-resolve (`grAuto`). The **army tokens** that landed in train 11 show a "Good odds / Even fight / Bad odds" pill built on that old estimate (`gtkEst` / `gtkOdds` in `src/13e3-gtokens.js`), and the campaign test checks the pill against `grAuto` — after the merge that test calls a function that no longer exists.
- The new battles have their own odds (`gwOddsAt` / `gwuOddsHint` in `src/13a-gwar.js`, `13ab-gwarui.js`). Two odds for the same fight = a leftover of the old way. **The helper must point the token pill (and its test in `orch/grandtest.mjs`) at `gwOddsAt`** — mind the cost (12 play-throughs per call: cache per army/province/day so `grandsmooth` stays green).
- Other conflicts are small and listed here so the helper is quick: `src/13e-grand3d.js` (`g3HitAt` keep main's x0/x1 box + `gtkHover`; `g3Click` add `gwuClick` first), `src/08d-save.js` (keep main's `svFront`, take the branch's `svCanSave`), `src/08l-firsthint.js` (main's token wording + the branch's last sentence), `orch/smoke.mjs` (keep bldfix + fortline guards, drop the old Fight-it signature check), `orch/grandtest.mjs` (keep the armytokens guards, then the branch's new battle flow), index / grand bundle / sw.js → rebuild.
- Then one `orch/cigate.sh` run; the next train takes it in the campaign slot.

## Finished and waiting
| idea (branch) | own test run | result | waits for |
|---|---|---|---|
| Campaign battles on the map by days (nofightit) | 6cdd9f53 | all green, but on an old main | its helper: merge today's main + token odds (above), one test run |
| Kheibar freeze fix (freezefix) — helper stopped (handoff) | 4e92b695 | smooth-pc + audio red; newer head c18b9467 untested | a fix for the slow-frame tail (see run 14 below), two clean smooth-pc runs |

## In progress / not ready
| idea (branch) | last save | state |
|---|---|---|
| PLAN-75 + handover note for a fresh ORCH (plan75) | 20 min | documents only (not for main on their own) |
| Battle report card + front lines (finish-report) — helper stopped (handoff) | 11 h | tutorial + migrate-down red on its run; nobody is re-running it |
| Infiltrators look like spies (spylook) | 10.5 h | cfclient + migrate-down red, 226 commits behind main; nobody is updating it |
| Trees on the campaign map (maptrees) — helper stopped (handoff) | 17 h | old green run; needs a fresh run on today's main |
| Campaign real supply (c-supply) — helper stopped (handoff) | 27 h | parked |
| Old parked (safetyH, dashJ, greenK-*, lang-campaign, onelanguage, seamless-flow, c-proxy-warfare) | 34–45 h | unchanged, conflict with main, helpers gone |

**Nobody has saved any game work in the last 3.5 hours** (last: nofightit 221 min, freezefix 237 min, battleclean 262 min ago). No helper appears to be building right now.

## Not started by anyone
- **Fight-it battle hangs at "PREPARING GRAPHICS… 78%"** (moot for the campaign once nofightit lands; still check Conquest / Battle loads on his Windows laptop).

## Locks with nothing saved (90+ min, no work branch of that name)
- **Real war** (`taken/realwar`), **Seamless HUD** (`taken/seamless-hud`), **Army standards** (`taken/army-standards`) — 35 h old, stale.
- `taken/c-real-supply` saves as c-supply; `taken/finish-tokens` saved as armytokens2 (landed) — not lost.
- All other locks (q-speed, c-escalation, c-war-support, c-stockpiles, mapcoast, mapscale, calmmap3/4, lang-*, extras-*) have a branch of the same name with nothing unlanded, 18–36 h old.

## Flaky tests — still nobody owns these
`cfclient` group, `tutorial`, `mpsync`, `migrate*`.

---
(previous runs below)

# STATE — conductor run 14 on 2026-11-12, 10:50–12:30 UTC: **train 11 LANDED** — main = 5f22d184

**Went live (5 pieces, one push, 27 of 27 tests green on the landed commit, same set as main had):**
army tokens on the campaign map · main menu shows your war · commander's radio + edge alerts · building fix (nothing floats) · fortification lines.
Local: build + --check after every merge, SMOKE PASS on the final train, DECISIONS PASS; campaign test green on GitHub (`gate/grand`).

**Taken out: Kheibar freeze fix (orch/freezefix).** First test run of this train (`train/20261112-1052`, d1253a70, with the freeze fix)
came back 25 green, `smooth-pc` and `audio` red (PC smoothness: slowest frames 519 / 732 ms against a limit of 474 / 614, twice in a row).
Evidence it is the freeze fix and not a slow test machine:
| run | has freeze fix | slow-frame p95 / p99 (ms) | result |
|---|---|---|---|
| main 7b4baa29 | no | 378 / 564 | green |
| building fix 349759bd | no | 231 / 290 | green |
| fortification lines a05a942b | no | 233 / 291 | green |
| **train 11 as landed 5f22d184** | **no** | **238 / 316** | **green** |
| freeze fix 172b31e5 | yes | 479 / 551 | green, barely |
| freeze fix 4e92b695 (README-only commit) | yes | 417 / 626 | **red** (+ audio red) |
| train 10 a6a4902f | yes | 253 / 376 | green |
| train 11 first try d1253a70 | yes | 519 / 732 | **red** (+ audio red) |
Three of four runs with the freeze fix have a much longer slow-frame tail; median frame time is unchanged (~180–200 ms on the test machine).
The one allowed re-test was the train without it (`train/20261112-1150`, 5f22d184): all green → landed.
**Freeze-fix helper:** the fix removes the big strike freeze but seems to add periodic slow frames in a normal 450-unit battle
(look at what now runs every frame or every few frames for the corner picture / warm-up / performance log `src/08o-perflog.js`);
`audio` went red in both red runs too (crossfade timing; AU.err) — probably the same stalls. Needs a clean `smooth-pc` twice before the next train.
Note for whoever merges it later: `train/20261112-0835` and `-1052` are dead; merge `orch/freezefix` fresh onto main.

Deviation, stated plainly: on the re-built train smoke was run once on the final result (not after each of the 5 merges) — the same five pieces
had passed smoke merge-by-merge in the first train of this run and the only difference was removing the freeze fix.

## Finished and waiting for the next train
| idea (branch) | own test run | result | waits for |
|---|---|---|---|
| Campaign battles fought on the map by days (nofightit) | 6cdd9f53 | **all green**, already on top of train 9 | next train (big: 60 files; needs a merge with train 11, then campaign pieces slot) |
| Conquest full base + $10,000, Battle clean-up (battleclean) — helper stopped (handoff) | 4a81f05a | all green alone; branch head 97c47063 is newer and untested; was the culprit on train 10 (tutorial) | next train, LAST (changes battle rules); test head first |
| Kheibar freeze fix (freezefix) — helper stopped (handoff) | 4e92b695 | smooth-pc + audio red | a fix for the slow-frame tail (see above) |

## In progress / not ready (nobody has saved anything in the last 100 minutes)
| idea (branch) | last save | state |
|---|---|---|
| Bundled fonts (finish-menu-fonts) | 8.5 h | its run had smooth-pc red; nobody is updating it |
| Infiltrators look like spies (spylook) | 8.5 h | cfclient + migrate-down red, 180+ commits behind main; nobody is updating it |
| Battle report card + front lines (finish-report) — helper stopped (handoff) | 9 h | tutorial + migrate-down red on its run; handoff asks for a re-run, nobody is doing it |
| Trees on the campaign map (maptrees) — helper stopped (handoff) | 15 h | old green run; needs a fresh run on today's main |
| PLAN-75 (plan75) | 11 h | document only |
| Campaign real supply (c-supply) — helper stopped (handoff) | 25 h | parked |

## Not started by anyone (reported by the freeze-fix helper)
- **Fight-it battle hangs at "PREPARING GRAPHICS… 78%"** on Abdullah's Windows laptop (Chrome "Page Unresponsive"): shader warm-up is one long
  blocking step on PC. Suggested fix is written in `orch/HANDOFF-freezefix.md` on orch/freezefix. No helper owns it.

## Locks with nothing saved (90+ min, no work branch of that name)
- **Real war** (`taken/realwar`), **Seamless HUD** (`taken/seamless-hud`), **Seamless flow**, **Army standards** (`taken/army-standards`) — 33 h old, stale.
- **Faster game speed** (`taken/q-speed`), **Escalation** (`taken/c-escalation`), **War support** (`taken/c-war-support`), **Stockpiles**, **Map coast / scale**, **Calm map 3 / 4**, **languages (battle / campaign)** — 16–33 h old, no branch of that name with unlanded work.
- `taken/c-real-supply` saves as c-supply; `taken/finish-tokens` saved as armytokens2 (landed) — not lost.

## Flaky tests — still nobody owns these
`cfclient` group, `tutorial`, `mpsync`, `migrate*`. (`audio` and the `smooth-pc` tail were on this list; today's table says they follow the freeze fix.)

---
(previous runs below)

# STATE — conductor run 12, RESULT at 09:30 UTC: **nothing landed** (train 10 was one test short, twice) — run 12 is OVER

**Main is still 7b4baa29** (train 9, 28 of 28 green). Nothing was pushed to main.

**Test run 1 — full train `train/20261112-0700` (121ad35b: freeze fix + army tokens + menu + radio + Conquest/Battle clean-up): 25 of 28.**
- `tutorial` red: "step 14 never started (stuck on none)" — the tutorial ends before its last step.
- `superfreeze` red: the Kheibar strike froze for 1.4 s again (4 shaders / 2 new "basic" programs compiled at the hit). Green on the freeze fix alone and on the train without the clean-up.
- `cfclient` red: "the creator gets no fresh battle state from the server".
- Culprit = **Conquest/Battle clean-up (orch/battleclean)**: its own three runs all had `tutorial` red (step 3, step 4, step 14), and both tutorial and superfreeze went green as soon as it was taken out.

**Test run 2 (the one allowed re-test) — train without the clean-up, `train/20261112-0835` (a6a4902f: freeze fix + army tokens + menu + radio + history line): 27 of 28.**
- smooth-pc, smooth-mp, grandsmooth, tutorial, superfreeze, audio, mpsync, migrate*: all green. Local: build, --check, SMOKE PASS after every merge, DECISIONS PASS, GRANDTEST PASS (on the full train).
- Only red: `cfclient` — inside that group CFE2E said "the server did not start the battle after both loading screens closed" (the loading screens took 263 s on that runner); everything after it in the same test (orders, sync checks, reconnect, restart) passed, and CFOVER passed.
  The same group failed on a *different* sub-test in every run tonight (CFCLIENT on run 1, CFSTARTPICK on the menu and spy branches, CFOVER on train 9's second run) — it is a flaky group, not this train.
- Rule: "still red after one re-test → land nothing". Main has no red, so the train did not land. No test was skipped or re-run to get around it.

**For the next conductor run (this run has stopped; `train/20261112-0700` is dead, `train/20261112-0835` is ready):**
- If main is still 7b4baa29: `train/20261112-0835` (a6a4902f) needs nothing but one clean test run — run `orch/cigate.sh a6a4902f` as that run's one gate; green → push it to main as is (history line is already in it).
- Helpers have saved newer commits since the merge (freeze fix c18b9467, army tokens ca6b3160, clean-up 97c47063, building fix 349759bd) — if a new train is built instead, use those.
- **Clean-up helper (battleclean):** the tutorial test must pass on your own branch first (4 red runs out of 4), and check `superfreeze` together with the freeze fix (merge orch/freezefix into your branch): something new in a battle compiles two "basic" shader programs when the Kheibar strike hits.
- **Someone must own the flaky online tests** (`cfclient` group, `migrate*`, `mpsync`, `tutorial`, `audio` timing): with ~1 flaky red per run and a "no red" rule, trains of several pieces rarely get through. This cost two trains tonight (9 and 10).

---

# STATE — conductor run 13 on 2026-11-12, 08:50–09:00 UTC (state only: another conductor run is still testing train 10)

**Main = 7b4baa29** (train 9), 28 of 28 green. Nothing landed in this run, on purpose.
`train/20261112-0835` (head a6a4902f, test branch `gate/a6a4902f52`) was pushed 20 minutes before this run and is not in main, so the
rule "another conductor is still working → state only" applies. This run built no train and pushed nothing but this page.

**Train 10, second try = `train/20261112-0835`**: freeze fix, army tokens, main menu shows your war, commander's radio + edge alerts.
Its test run is in progress: 8 tests finished, all green, 20 still running (08:55 UTC).
The first try (`train/20261112-0700`, 121ad35b) also had the Conquest/Battle clean-up and came back with `tutorial` and `superfreeze`
red (21 green, rest not reported) — the clean-up was taken out for the second try, as run 12 predicted.

## Finished and waiting for the next train
| idea (branch) | own test run | result | waits for |
|---|---|---|---|
| Conquest full base + $10,000, Battle clean-up (battleclean) — helper stopped with a handoff | 4a81f05a | **28 of 28** (newer than the commit that failed on train 10) | next train, last in order (changes battle rules) |
| Fortification lines (fortline) | a05a942b | **28 of 28** (branch head 1acb73d3 only adds proof pictures) | next train |
| Building fix — no floating roofs (bldfix) | 349759bd | 27 green, 0 red, 1 not reported | next train (check the missing one first) |

## In progress / not ready
| idea (branch) | last save | state |
|---|---|---|
| Campaign battles fought on the map by days (nofightit, 5 commits) | 74 min | own run e72f706a: 25 green, `grand` + `grandlive` red — these are the campaign tests, so the piece itself is the suspect; not ready |
| Freeze fix, newest note commit (freezefix 4e92b695) | 76 min | 24 green, `audio` + `smooth-pc` red on a commit that only changes a README — flaky list; the train carries 172b31e5 |
| Bundled fonts (finish-menu-fonts) | 6.5 h | its run had smooth-pc red (look change); nobody is updating it |
| Infiltrators look like spies (spylook) | 6.5 h | cfclient + migrate-down red, far behind main; nobody is updating it |
| Battle report card + front lines (finish-report) — helper stopped (handoff) | 7 h | tutorial + migrate-down red on its run; handoff asks for a re-run, nobody is doing it |
| Trees on the campaign map (maptrees) — helper stopped (handoff) | 13 h | handoff says 28 of 28 on 22ac8a8, but that run is old; needs a fresh run on today's main |
| PLAN-75 (plan75) | 9 h | document only |
| Campaign real supply (c-supply) — helper stopped (handoff) | 23 h | parked |

## Locks with nothing saved (90+ min, no work branch of that name)
- **Real war** (`taken/realwar`), **Seamless HUD** (`taken/seamless-hud`), **Army standards** (`taken/army-standards`) — over 30 h old, stale.
- `taken/c-real-supply` saves as c-supply; `taken/finish-tokens` saves as armytokens2 — not lost.

## Flaky tests — still nobody owns these
`tutorial`, `audio`, `mpsync`, `migrate*`, `cfclient`, and the `smooth-pc` frame tail (again today: red on a README-only commit).

---
(previous runs below)

# STATE — conductor run 12 on 2026-11-12, 06:50–… UTC (train 10 is being tested; result line is added below when known)

**Main = 7b4baa29** (train 9). Main's own test run finished **28 of 28 green**.
Note on the "another conductor is working" check: `train/20261112-0505` is younger than 110 minutes and not in main, but run 11's state
page (06:30 UTC) says that train is dead and replaced by `train/20261112-0640`, which IS main. So nobody else was working; this run went on.

**Train 10 = `train/20261112-0700`** (head 121ad35b, test branch `gate/121ad35b8f`), merged in this order, build + --check + SMOKE PASS after each:
1. Kheibar strike freeze fix (orch/freezefix, 172b31e5) — the freeze when the "breaking news" strike picture appears.
2. Army tokens on the campaign map (orch/armytokens2, e301b90b) — dots far away, tokens in the middle, figures up close.
3. Main menu shows your war (orch/finish-menu, 620b7e76).
4. Commander's radio + edge alerts (orch/finish-radio, 54862c4d) — one hand-merge in the What's-new list (both entries kept).
5. Conquest full base + $10,000, Battle without supply lines, road colors by owner, rally flag only while selected (orch/battleclean, 7f58999e) — changes battle rules, so last.

## The pieces' own test runs (all on GitHub, finished)
| idea (branch) | own run | result | reading |
|---|---|---|---|
| Freeze fix (freezefix) | 172b31e5 | 26 of 28: audio (crossfade timing), migrate-down (client never appeared in lobby) red | both on the flaky list |
| Army tokens (armytokens2) | adfc9d88: 28 of 28 (on train 7); e301b90b (with trains 8-9): 26 of 28, tutorial + mpsync red | flaky list (mpsync was red on main 1407bde2 with the same words) |
| Main menu shows your war (finish-menu) | 620b7e76 | 27 of 28: cfclient red | flaky list |
| Commander's radio (finish-radio) | 54862c4d | 28 of 28 (on train 6) | clean, but old base |
| Conquest/Battle clean-up (battleclean) | 7f58999e | 25 of 28: tutorial, audio, mpsync red; 0e53000f before it: tutorial + smooth-pc red | **tutorial red three runs in a row** — this piece changes the tutorial, so it is the first suspect if the train's tutorial test is red |

## Not on the train
| idea (branch) | last save | why not |
|---|---|---|
| Building fix — no floating roofs (bldfix, 1 commit) | 1 h | saved, but the helper has not run the tests on it yet |
| Campaign battles fought on the map by days, step 1 of 3 (nofightit, 1 commit) | just now | in progress, no test run; changes campaign rules → last on a later train |
| Fortification lines (fortline, 1 commit) | 2 h | no test run yet |
| Bundled fonts (finish-menu-fonts) | 4.5 h | its run had smooth-pc red (look change) |
| Infiltrators look like spies (spylook) | 4.5 h | cfclient + migrate-down red on its run, 183 commits behind main; nobody is updating it |
| Battle report card + front lines (finish-report) — helper stopped (handoff) | 5 h | tutorial + migrate-down red on its run; handoff asks for a re-run, nobody is doing it |
| Trees on the campaign map (maptrees) — helper stopped (handoff) | 11 h | no fresh run |
| PLAN-75 (plan75) | 7 h | document only |

## Locks with nothing saved (90+ min, no work branch of that name)
- **Real war** (`taken/realwar`), **Seamless HUD** (`taken/seamless-hud`), **Army standards** (`taken/army-standards`), **Real supply** (`taken/c-real-supply`) — over 20 h old, stale.
- (`taken/finish-tokens` saves as armytokens2.) Battle clean-up, building fix and freeze fix, listed here last run, have all saved their work since.

## Flaky tests (same game code, different results) — still nobody owns these
`tutorial`, `audio`, `mpsync`, `migrate*`, `cfclient`, and the `smooth-pc` frame tail. Tonight every helper run had 1–3 of them red while main's own run was 28 of 28.

---
(previous runs below)

# STATE — conductor run 11 on 2026-11-12, 04:55–06:30 UTC (train 9 landed: fixes + notes; the radio did NOT land)

**Main = 7b4baa29** (train 9 on top of 1407bde2). Main's head before this run (1407bde2, train 7): 27 of 28 green, `gate/mpsync` red
("client view diverged from the host in 2/11 live checks") — train 7 only changed the campaign map's look, so this looks like a flaky run.

Run 10 (02:50 UTC) pushed `train/20261112-0251` (commander's radio) and then stopped without testing or landing it and without a state page.
That train is replaced by this run's work; the branch is left alone.

**Landed, train 9** = `train/20261112-0640`:
1. Four small fixes (orch/fixes1, merge dcc23a59): tutorial — a soldier standing at a house door now obeys the order to go in, tips stay up 1.5 s;
   hover card guard (BEATS / WEAK TO); campaign map — no more white cliffs in Arabia on the first map of a session; palms no longer tower over towns.
2. Three bug pictures from Abdullah (orch/bugpics, 9b9e3157) — pictures only, in orch/concepts/bugs/.
3. Map fairness report (orch/q-mapfair, 962a66a3) — report only; queue line marked, stays open for its small follow-ups.
Proof: the train's game files are byte-identical to the helper's own tested commit b64f055d (fixes1 on top of train 7), which is **28 of 28 green**
incl. smooth-pc / smooth-mp / grandsmooth; `git diff b64f055d train` = notes, pictures, HISTORY, QUEUE only. Build + --check OK.

**NOT landed: commander's radio + edge alerts (orch/finish-radio).** Exactly why:
- First train `train/20261112-0505` = fixes1 + radio + pictures + report. Local: build, --check OK, SMOKE PASS (415 s).
- Test run 1 (e9fd2d87d9): 27 of 28, **smooth-pc red** — p95 frame time 546 ms (allowed 474), p99 684 (allowed 614), worst-1% FPS 1.31 (min 1.7);
  the median frame was fine (158 ms). The gate's built-in second attempt was also over.
- No culprit could be named from the pieces' own runs: fixes1 (b64f055d) and the radio (54862c4d) are each 28 of 28 on their own, and the same
  frame-tail pattern failed smooth-pc on the menu branch (d998b8da, 0278047f), which contains neither. So the one allowed re-test was run on the same train.
- Test run 2 (602ba621f2, same game files + HISTORY/QUEUE lines): smooth-pc **green**, but 25 of 28: **audio** ("victory plays the victory track…"),
  **migrate** ("client A (the standby) never received a checkpoint") and **cfclient** red — all three green in run 1.
- Every test was green in one of the two runs, so this is most likely flaky tests, but the rule is "still red after one re-test → do not land".
  The radio is the only piece of that train without a clean run on today's main (its own green run was on train 6), and it touches the sound code
  (src/09b-radio.js) and the battle HUD, so it was taken out and the rest landed on its existing proof.
- **Radio helper / next run:** merge main into orch/finish-radio, run orch/cigate.sh once; if it is green it lands first thing.

## Flaky tests seen tonight (same game code, different results) — someone should own these
- `cfclient` (status red although the last line says PASS — one of the cfbattle/cfclient files in the group fails): menu 620b7e76, spy look 9e96cb3a, report 94d9da88, train run 2.
- `migrate` / `migrate-down` / `migrate-dual` ("standby never received a checkpoint"): spy look, report, army tokens, train run 2.
- `smooth-pc` frame tail (p95/p99 only, median fine): menu x2, train run 1. `audio`, `tutorial`: several branches. `mpsync`: main 1407bde2.

## Finished-looking pieces NOT taken this run

| idea (branch) | last save | newest own test run | why not on the train |
|---|---|---|---|
| Commander's radio + edge alerts (finish-radio, 5 commits) | 4 h | 54862c4d: 28 of 28 (on train 6) | see above — needs one clean run on today's main |
| Main menu shows your war (finish-menu, 8 commits) | 2 h | 620b7e76: 27 of 28, **cfclient red**; two earlier runs smooth-pc red | red that main does not have; one re-run needed (cfclient looks flaky) |
| Bundled fonts (finish-menu-fonts, 7 commits) | 2.5 h | d998b8da: **smooth-pc red** | look change with smooth red |
| Infiltrators look like spies (spylook, 2 commits) | 2.6 h | 9e96cb3a: 25 of 27, **cfclient + migrate-down red** | reds main does not have; based on old main, needs merge + re-run |
| Battle report card + front lines (finish-report, 8 commits) — HANDOFF, helper stopped | 3 h | fe6bdd92: 26 of 28, **tutorial + migrate-down red** | handoff asks for a re-run of those two; nobody is doing it |
| Army tokens, second try (armytokens2, 13 commits) — HANDOFF, helper stopped | 12 min (handoff note) | 79ed8f99: 25 of 28, **tutorial, audio, migrate-dual red** (migrate-dual red twice) | needs merge of main + re-run; nobody is doing it |
| Fortification lines by Construction Vehicles (fortline, 1 commit) | 12 min at 04:55 | none | no test run yet; changes battle rules → goes last on a train |
| PLAN-75 (plan75) | 5 h | - | document only |

## Locks with nothing saved (90+ min, no work branch)
- **Battle clean-up** (`taken/battleclean`), **Building fix** (`taken/bldfix`), **Freeze fix** (`taken/freezefix`) — locked ~4 h ago (about 01:00 UTC), nothing saved under those names.
- **Real war** (`taken/realwar`), **Seamless HUD** (`taken/seamless-hud`), **Battle language** (`taken/lang-battle`) — over a day old, nothing saved, stale.
- (`taken/finish-tokens` saves as armytokens2; `taken/fixes1` landed this run.)

**For the next conductor run:** `train/20261112-0640` is IN main. `train/20261112-0251` and `train/20261112-0505` are dead (not landed, replaced).
Candidates: finish-radio, finish-menu, spylook, finish-report, armytokens2 — each after a clean run on today's main; fortline last.

---
(previous runs below)

# STATE — conductor run 9 on 2026-11-12, 00:50–01:10 UTC (train 7 landed: 1 piece)

**Main = 1407bde2** (train 7 on top of 1143f7c2). Main's head before this run (1143f7c2) was 28 of 28 green — the tutorial test recovered.
Live site: the Pages build finished 01:04 UTC and https://abdullahhaidar5-ux.github.io/ww3/ serves train 7 (checked 01:11 UTC: page names the new campaign bundle grand.a7f5e0a1a6.js).

**Landed, train 7** = `train/20261112-0052`:
1. Campaign map: much gentler mountains (orch/mtnfix2, merge ae9a73ba) — Abdullah asked 2026-11-11 17:36 ("mountains are still way too steep").
   Relief height cut by almost half again, softer slope shading. Changes only src/13g-grandlook.js.
Gate: NOT re-run, on purpose — the train's files are byte-identical to the helper's own tested commit 475490b9 (it was built on main's head;
`git diff 475490b9 train` is empty), and that commit is **28 of 28 green** incl. smooth-pc / smooth-mp / grandsmooth. Only a HISTORY line was
added on top. Local: build + --check OK, SMOKE PASS (503 s). No QUEUE line existed for it. The push to main starts main's own full test run.

## Finished-looking pieces NOT taken this run (helpers all still active, saved within the last hour)

| idea (branch) | last save | newest own test run | why not on the train |
|---|---|---|---|
| Battle report card + front lines on the campaign map (finish-report, 6 commits) | 35 min | 94d9da88: 24 green, **grand + decisions red** | red tests main does not have; helper must fix |
| Army tokens, second try (armytokens2, 12 commits; lock finish-tokens) | 5 min (new commit 58b00d5c, untested) | 79ed8f99: 25 green, **tutorial, audio, migrate-dual red**; earlier a2242b26: decisions + migrate-dual red | migrate-dual red twice in a row; main is green on all three |
| Commander's radio + edge alerts (finish-radio, 5 commits) | 5 min | 54862c4d: just started (2 green so far) | test run not finished |
| Main menu shows your war + bundled fonts (finish-menu, 4 commits) | 25 min | none | no test run pushed yet |
| Map fairness proof — 1,532 computer battles on 116 maps (q-mapfair, 2 commits) | 2 h | not needed | report/notes only, no game change; must ride inside a code landing (docs never go to main alone). Handoff written = helper stopped |
| PLAN-75 — plan and usage rules (plan75, 1 commit) | 1 h | - | document only |

## Locks with nothing saved (90+ min, no work branch)

- **Fixes 1** (`taken/fixes1`, ~1.7 h) — nothing saved under that name (may be the mountain fix, which landed; unclear).
- **Real war** (`taken/realwar`, 23 h), **Seamless HUD** (`taken/seamless-hud`, 23 h) — nothing saved, stale.

Old parked branches (extras-*, lang-campaign, seamless-flow, safetyH, dashJ, greenK-*, dashI, c-proxy, q-sound …): unchanged since run 8's table
below; several are now being carried forward by the finish-* helpers (lang-campaign → finish-report, extras-story → finish-menu,
extras-battle + extras-command → finish-radio).

**For the next conductor run:** `train/20261112-0052` is IN main. Likely candidates: finish-radio, finish-menu, finish-report, armytokens2 —
each once its own test run is finished and has no red that main lacks.

---
(previous runs below)

# STATE — conductor run 8 on 2026-11-11, 22:48–23:35 UTC (train 6 landed: 1 piece)

**Main = 1143f7c2** (train 6 on top of aa8968fd). Live site: the Pages build for 1143f7c2 finished successfully at 23:25 UTC, so https://abdullahhaidar5-ux.github.io/ww3/ serves train 6.

**Landed, train 6** = `train/20261111-2254`, gated as 0a0b505e (branch gate/0a0b505ef2, run 43115684920): **27 of 28 green**, incl. smooth-pc /
smooth-mp / grandsmooth, grand, grandlive, decisions, audio. Only red: `gate/tutorial` — also red on main's head aa8968fd before this train.
1. Campaign, escalation ladder slice 2 (orch/c-escalation2, merge 0a0b505e): a war now has levels — limited war, blockade, strikes on industry
   and cities, nuclear alert. Helper's own run c3bf5df5 was green except the flaky audio test; handoff said READY TO LAND. Queue item stays open
   (more slices planned), line marked with the hash. Picture: orch/shots/grand2/war-level.png.
Conflicts: generated files only (rebuilt), HISTORY (both sides). The branch also carried 12 test pictures a local run had overwritten — main's
versions kept, only the new war-level picture taken. Local: build + --check OK, SMOKE PASS (430 s). Local decisions / grandtest did not finish
in the sandbox (stopped after 10+ minutes); GitHub's `gate/decisions` and `gate/grand` are green on the gated commit.

## WATCH: the tutorial test is red on main since the speed work landed (aa8968fd, 21:51 UTC)

- main 737fab9d (train 5): 28 of 28 green. main aa8968fd ("Stay smooth" q-speed, pushed by its helper): `gate/tutorial` red ("step 3 never
  started (stuck on 4)") and `gate/audio` red. Train 6 on top: `gate/tutorial` red again ("step 9 did not complete"), audio green.
- Train 6 only changes campaign files (src/13*), which the tutorial never loads, so it is not the cause. Two reds in a row at different steps
  right after a frame-pacing change points at the speed work (or a slow-runner timing problem in the test). **Owner: the speed helper (q-speed).**
  Not investigated further by the conductor (no feature/sim changes allowed here).

## Helpers with unlanded work, read 23:00 UTC

| idea (branch) | last save | newest own test run | result / note |
|---|---|---|---|
| Army tokens, second try on today's map (armytokens2, 7 commits; lock taken/finish-tokens) | 0.6 h at 22:53 | none yet | helper still working; no test run pushed, so not a candidate this run. Look change: needs its smooth tests green |
| Map fairness (lock taken/q-mapfair, 4.3 h) | - | - | **nothing saved** (no work branch) |
| Real-looking forest, extra merge commit (maptrees) | 3 h | 22ac8a8349 green | nothing new in it — forest is on main |
| Real supply notes (c-supply) | 13 h | - | notes only |
| Extras: battle — commander's radio (extras-battle) | 20 h | 60d5e246b5 | grandlive, migrate-down red (old run) |
| One language: campaign — battle report card (lang-campaign), spec (onelanguage) | 20 h | 0aee49223e | build check fails |
| Army tokens, first try (armytokens) | 20 h | 4eeb0c339c | replaced by armytokens2 |
| Seamless flow — one setup for all three games (seamless-flow) | 20 h | e1c344c7d8 | audio, smooth-pc red (old run) |
| Extras: command — edge alerts (extras-command) | 20 h | 4a7c989031 | audio, cfclient, smooth-pc red (old run) |
| Extras: story — main menu shows your war (extras-story) | 21 h | d1aef6c3d2 | cfclient, controls red (old run) |
| Proxy militias' own agenda (c-proxy) | 33 h | - | 1 commit, never tested |
| Safety H — report-a-problem form + nightly balance report (safetyH) | 33 h | 5dfef609ec | adds a scheduled workflow (conductor does not start those) |
| End screen damage dealt (dashJ) | 33 h | 673e996495 | mpsync, migrate-dual red (old run); touches the simulation |
| Stuck units + controls feel + campaign safety copies (greenK-snap / greenK-qfeel / dashI / loop-grand-snap) | 33–39 h | 1bb5e66377 | mpsync red (old run); touches the simulation |
| Sound mix (q-sound), Autosave loop, Leaders C, Speed D | 38–42 h | old | - |

Everything from "Extras: battle" down is 20+ h behind main, conflicts with it, and its helper is gone: each needs someone to merge main in and
run a fresh test (the tests are stable enough now that a red result means something). Not train candidates until then.

## Locks with nothing saved (90+ min, no work branch)

- **Map fairness** (`taken/q-mapfair`, 4.3 h) — nothing saved.
- **Real war** (`taken/realwar`, 21 h) — nothing saved.
- **Seamless HUD** (`taken/seamless-hud`, 21 h) — nothing saved.
- (`taken/army-standards`, 21 h: concept only — the work continues as armytokens2.)

**For the next conductor run:** `train/20261111-2254` is IN main. Likely next candidate: armytokens2 once its helper pushes a test run.

---
(previous runs below)

# STATE — conductor run 6 on 2026-11-11, 18:50–21:10 UTC (train 5 landed: 2 pieces, ALL 28 tests green)

**Main = 737fab9d** (train 5 on top of 8cee2c2f). Live site: the Pages build for 737fab9d finished successfully at 21:10 UTC, so https://abdullahhaidar5-ux.github.io/ww3/ serves train 5.

**Landed, train 5** = `train/20261111-1857`, gated as 09360b3f (run 43087909414): **28 of 28 green** — first fully green run in two days
(audio, cfclient, tutorial, mpsync, decisions all green; smooth-pc / smooth-mp / grandsmooth green).
1. Campaign map, believable scale up close (orch/mapscale, merge 0cc2a0ef): towns are small clusters inside their province, no beige plate, thin roads,
   close-view army figures no taller than their town, armies on islands the map cannot draw show as a ship. Pictures: orch/concepts/scale/ (before/after).
2. UK, Australia and Canada get their own English soldier voices (orch/voicesV, merge 09360b3f) — waited 23 h; its only red tests were the flaky ones.
Conflicts: one line in src/13e-grand3d.js (kept calm map 4's rule for which name plates show + map scale's lift that follows the town size, as the
helper's handoff asked), orch/grandtest.mjs (forest guard + scale guard + calm map 4 line all kept), HISTORY / QUEUE (both sides), generated files rebuilt.
Local: build + --check OK and SMOKE PASS after each merge (529 s, 546 s). Local decisions / grandtest did NOT finish in this sandbox (over 9 minutes each,
cut off; the map-scale guard itself printed clean) — GitHub's `gate/decisions` and `gate/grand` are green on the same commit.
GitHub's runners were slow: the run sat queued behind "Smooth baseline" and "Map fairness" runs and took 88 minutes.
Main moved during the run (8a6f61f3 audio test fix, 8cee2c2f loop log — test/docs only); merged in, no game file differs from the gated commit.
CLAUDE.md: the "RIGHT NOW — main is red" bullet is replaced by a short standing rule "Test on GitHub, not here" (the sandbox-too-slow part is still true;
the red-main restrictions are gone). "Save early" was already there.

## Helpers with unlanded work (older pieces; for the three NEW ones — steadier frame rate q-speed, escalation slice 2, audio test fix — see run 7's table below, read 20:55 UTC)

| idea (branch) | last save | newest own test run | red tests / note |
|---|---|---|---|
| Real-looking forest, extra merge commit (maptrees) | 3 h | 22ac8a8349 green | nothing new in it — forest is on main; only an old merge |
| Real supply notes (c-supply) | 11 h | - | notes only |
| Extras: battle — commander's radio (extras-battle) | 18 h | 60d5e246b5 | grandlive, migrate-down |
| One language: campaign — battle report card, front lines (lang-campaign) | 18 h | 0aee49223e | check (build check fails) |
| Army tokens (armytokens) | 18 h | 4eeb0c339c | decisions, mpsync, tutorial; handoff written |
| Seamless flow — one setup for all three games (seamless-flow) | 18 h | e1c344c7d8 | audio, smooth-pc |
| Extras: command — edge alerts (extras-command) | 18 h | 4a7c989031 | audio, cfclient, smooth-pc |
| Speed S (speedS) | 18 h | cf33e78fb7 | helper says not to land |
| Extras: story — main menu shows your war (extras-story) | 19 h | d1aef6c3d2 | cfclient, controls |
| Proxy militias' own agenda (c-proxy) | 31 h | - | 1 commit, never tested |
| Safety H — report-a-problem form + nightly balance report (safetyH) | 31 h | 5dfef609ec | audio; adds a scheduled workflow (conductor does not start those) |
| End screen damage dealt (dashJ) | 31 h | 673e996495 | mpsync, migrate-dual, audio; touches the simulation |
| Stuck units + controls feel + campaign safety copies (greenK-snap / greenK-qfeel / dashI / loop-grand-snap) | 31–37 h | 1bb5e66377 | mpsync, audio; touches the simulation |
| Sound mix (q-sound), Autosave loop, Leaders C, Speed D | 36–40 h | old | - |

All of these are 18+ h behind main, conflict with it (checked with a trial merge: only dashJ merges clean), and their helpers are gone.
They need someone to merge main in and run a fresh test; with the tests now stable a red result will mean something.

## Locks with nothing saved (90+ min, no work branch)

- **Real war** (`taken/realwar`, 19 h) — nothing saved.
- **Seamless HUD** (`taken/seamless-hud`, 19 h) — nothing saved.
- **Army standards** (`taken/army-standards`, 19 h) — concept sheet on the lock only.
- (Map scale is off this list: saved, tested, landed.)

**For the next conductor run:** nothing is waiting in a finished state. `train/20261111-1857` is IN main.

---
(previous runs below; run 7 was a state-only run made while this run was still waiting for the tests)

# STATE — conductor run 7 on 2026-11-11, 20:50–21:05 UTC (state only: train 5 of the previous run is still being tested)

**Main = 068b3146** (train 4, unchanged since 18:36 UTC). Nothing landed in this run, on purpose.

**Why state only:** `train/20261111-1857` (09360b3f) was pushed 104 minutes before this run started and is not in main, so the previous
conductor run may still be working on it (110-minute rule). Its GitHub test run 43087909414 (gate/09360b3ff1) is still going — GitHub's
queue is long tonight (7 runs queued). At 20:55 UTC: **27 tests green, 0 red**, incl. smooth-pc / smooth-mp / grandsmooth, tutorial, mpsync,
audio; still to report: `gate/cfclient` (red on every run, also on main). Train 5 holds 2 pieces:
1. Towns, roads and armies at believable scale on the campaign map (orch/mapscale; own run gate/0cb274886b: 28 of 28 green)
2. UK, Australia and Canada get their own English soldier voices

**For the next conductor run:** if train 5 is still not in main and no newer `train/*` exists, the previous run stopped before landing:
train 5 is then FINISHED and waiting — ignore the 110-minute rule for it, check the last status (cfclient red = same as main), rebase on main
if main moved, tick QUEUE / HISTORY, land it. (Run 6 wrote no STATE section; this page jumps from run 5 to run 7.)

## Helpers with unlanded work, read 20:55 UTC

| idea (branch) | last save | newest own test run | result / note |
|---|---|---|---|
| Stay smooth: steadier frame rate in battle (q-speed, 7 commits) | 0.5 h | a2bb4679b7 | still queued, no verdict; earlier run 14c950ff97: 16 green, audio red (flaky), not finished. Look/speed change: needs its smooth tests green |
| Audio test fix, test-only (loop-audiogate, 1 commit) | 1 h | 8a6f61f3ac | 23 green, **smooth-pc red** (a test-only change cannot cause that: smooth-pc looks flaky too), not finished |
| Escalation ladder slice 2: wars have levels (c-escalation2, 2 commits, "branch only") | 1 h | c3bf5df5f6 | 19 green so far, 0 red, still running; helper marks it branch-only |
| Real-looking forest (maptrees) | 1 h | 22ac8a8349 | 28 of 28 green; already on main via train 4 (branch only adds a merge + handoff) |
| Believable map scale (mapscale) — IN TRAIN 5, handoff written | 2.5 h | 0cb274886b | 28 of 28 green |
| Real supply notes (c-supply) | 11 h | - | notes only |
| Extras: battle / command / story | 18 h | 60d5e246b5 / 4a7c989031 / d1aef6c3d2 | old reds: grandlive + migrate-down / smooth-pc / controls; need a merge with main + fresh run |
| One language: campaign (lang-campaign), spec (onelanguage) | 18–19 h | 0aee49223e | build check fails |
| Army tokens (armytokens) | 18 h | 4eeb0c339c | decisions red; handoff written |
| Seamless flow (seamless-flow) | 18 h | e1c344c7d8 | smooth-pc red (may be the flaky one) |
| Proxy warfare (c-proxy-warfare / c-proxy) | 19 h / 31 h | - | handoff written, never tested on GitHub |
| greenK / greenK3 / greenK4 notes | 18–29 h | notes only | - |
| Voices V (voicesV) | 25 h | d19894f02f | old |
| Safety H, Dashboard J | 31 h | 5dfef609ec / 673e996495 | old reds (audio, mpsync, migrate-dual) |
| Stuck units + feel + safety copies (greenK-snap / greenK-qfeel / dashI / loop-grand-snap) | 31–37 h | 1bb5e66377 | mpsync, audio (both flaky) |
| Sound mix (q-sound), Autosave loop, Leaders C, Speed D | 36–40 h | old | - |

## Locks with nothing saved (90+ min, no work branch)

- **Map fairness check** (`taken/q-mapfair`, 2.3 h) — no work branch; it is running throwaway fairness runs on GitHub (mapfair/q-flagged-r2, -r3, queued). NEW on this list.
- **Real war** (`taken/realwar`, 19 h), **Seamless HUD** (`taken/seamless-hud`, 19 h), **One language: battle** (`taken/lang-battle`, 19 h) — nothing saved.
- **Army standards** (`taken/army-standards`, 19.5 h) — concept sheet on the lock only; test branch gate/6a19d97447 (red).
- `taken/c-escalation` (2.3 h) has saved its work as orch/c-escalation2 — fine.

**Flaky tests, still nobody owns them:** audio, mpsync, tutorial, cfclient (see run 5) and now smooth-pc looks flaky too (red on a test-only change).
The audio-test fix (loop-audiogate) is the first attempt at one of them.

---
(previous runs below)

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

Reds are from each helper's own newest test run. Main is