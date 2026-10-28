# QA playtest report — 2026-10-28

(in progress — summary goes here at 12:00 UTC)

Tested build: `origin/main` 1639dab (re-checked hourly, see "Re-checks" at the bottom). Headless Chromium with
SwiftShader (CPU WebGL), so absolute frame times are not meaningful — only spikes relative to the run.
Scripts: `orch/qa-menu.mjs` (menu/settings layout on 4 screens), `orch/qa-play.mjs` (full player run: menu → deploy →
build → train → select/order → powers → battle to the end → Play again / Main menu / Quit), shared `orch/qa-lib.mjs`.

## Findings (most severe first)

### Q0 · Multiplayer: a phone that reloads mid-battle gets no Rejoin — only works if they know the game code — Medium
- Steps: friend A hosts (desktop), friend B (phone, 390×844) joins from Open games, battle starts, B's page reloads
  (phone browsers do this when the tab is backgrounded or memory is low; or B pulls to refresh).
- Expected: B sees "Rejoin battle" (or the battle in Open games with a Join button) and gets their army back.
- Actual: B lands on the main menu; Open games shows the battle as "IN BATTLE" with a disabled button; the only
  other option is "Join by code" (B has to ask the host for the code). Nothing in the page remembers the battle across
  a reload (no session storage of the code/slot). The 2026-10-27 reconnect work covers dropped *connections*
  (page still open), not a reloaded page. Re-test: typing the battle's code into Join by code DOES put B back into
  the running battle — so it's recoverable, but only if B knows to ask the host for the code (the invite link with
  #join= would also work if B still has it). Suggest: remember the last battle's code for the session and show
  "Rejoin battle", or make the "IN BATTLE" row's button rejoin for a player whose slot is still theirs.
- Run: `node orch/qa-mplobby.mjs --client phoneP` (local wrangler server, browser-to-browser blocked).
- Screenshot: `orch/shots/qa/mp-client-after-reload-phoneP.png`

### Q1 · Defeat screen says "The last enemy capitulated" when YOU lost — Medium
- Steps: skirmish 1 vs 1 AI, lose (all your units/buildings destroyed). Seen: Mountain Shias vs US on Zagros, 1366×768.
- Expected: something like "You have been wiped out: every unit and building destroyed. United States won."
- Actual: "DEFEAT — The last enemy capitulated: every unit and building has been destroyed. United States won."
  From the loser's side the player *is* the "last enemy"; reads like you won. (`03-sim` endGame reason
  `The last enemy capitulated: …` is shown to every player regardless of side; `08-ui showEnd`.)
- Screenshot: `orch/shots/qa/hd-RS-zagros-1-end.png`

### Q2 · Settings screen: menu text shows through, "Done" floats over options (1920×1080, 844×390) — Low/Medium
- Steps: main menu → Settings.
- Expected: settings readable on their own background; Done button not covering anything.
- Actual: the main menu (nation cards) is visible through the settings overlay, so settings text sits on top of
  other text (hard to read on 1080p). The sticky "DONE" button sits on top of the "Scroll when the mouse touches the
  screen edge" On/Off buttons (1920×1080) and on top of the Soundtrack / Import music buttons (phone landscape) —
  you must scroll past it to reach them.
- Screenshots: `orch/shots/qa/settings-fhd.png`, `orch/shots/qa/settings-phoneL.png`

### Q3 · Command bar names cut off at 1366×768 — Low
- Steps: start any skirmish as Mountain Shias (long names) at 1366×768 → Powers tab.
- Actual: faction name shows "MOUNTAIN …", the strike power "Mountain …", powers "Mountain Wat…",
  "Tunnel Works…", "Hidden Fight…", "Labbayk Ya H…" (the war slogan is cut in half). A player can't read what
  they're unlocking without hovering.
- Screenshot: `orch/shots/qa/hd-RS-zagros-1-powers.png`

### Q3b · Phone landscape (844×390): build grid's last column is cut off under the right-hand panel — Medium
- Steps: phone held sideways, start any skirmish (seen: Coffee Shias, Golan Heights, 3 AI) → Build tab.
- Expected: whole buttons (the portrait bar was fixed to show exactly 4 whole columns on 2026-10-27).
- Actual: a 5th column ("Tu…", "Lo…" = Tunnel / …) peeks out and disappears under the strike/"LAUNCH" panel; the
  layout audit finds the Command HQ button underneath the LAUNCH button. Names in the visible columns are also cut
  ("Coffee Ro…", "Defense …", "Supply D…").
- Screenshot: `orch/shots/qa/phoneL-DW-golan-3-start.png`

### Q3c · Phone portrait: most build/unit/power names are cut to a few letters — Low
- 390×844, Iran: "Saffron B…", "Defense G…", "Supply De…", "IRGC Fiel…", "Construct…", "Spoils of …", "Takavar D…",
  "Missile Sa…", "Shahed S…", and the cost line "Unlock · 1 …". Players have to guess what a button builds.
- Screenshot: `orch/shots/qa/phoneP-IR-strait-1-powers.png`, `orch/shots/qa/phoneP-IR-strait-1-units.png`

### Q4 · Main menu still has "Host a game" button and "Host one…" wording — Low (known, in progress)
- Standing decision (2026-10-27 19:30): one "Play online" button, no hosting button or wording. Live `main` still shows
  "HOST A GAME" + "No open games right now. Host one, or type a friend's game code below." on every screen.
  BACKLOG says `orch/play-online` is on it — listed so it's re-checked when that ships.
- Screenshot: `orch/shots/qa/menu-fhd.png`

### Q5 · Phone portrait: Deploy button is ~3.5 screens down the menu — Low (UX)
- Steps: open the game on a 390×844 phone.
- Actual: menu is 3077 px tall; to start a battle you scroll past all 18 nation cards (the selected one expands to a
  long paragraph), the map picker, and 5 option rows. No sticky Deploy button. Friends on phones may not find it.
- Screenshot: `orch/shots/qa/menu-phoneP.png`

## Things that worked (no bug)
- Menu, settings, Done → back to menu on all 4 screens: no console errors, no off-screen or clipped controls.
- 1366×768, Mountain Shias vs US on Zagros: Deploy → loaded in 38 s; Barracks button → Generals left-click placement
  → built; units trained from the sidebar; left-click selects own unit; left-click ground sends a move order;
  battle ran to a result in 5:42; end screen → Play again started a fresh battle.

- 390×844 phone, Iran vs US, Strait: touch guide shows (Skip/Next), Barracks → tap spot → "✓ Build here" confirm
  → built; units trained; tap selects; tap ground orders; battle to the end (10:46) → Main menu works.
- 844×390 phone, Coffee Shias + 3 AI on Golan: same flow works; battle ended 9:46 (Egypt won).
- No console errors in any run; only two harmless warnings (Canvas2D willReadFrequently, THREE toNonIndexed).

- Multiplayer through the local game servers (`mpsync --server --reconnect --ais 1`): MPSYNC PASS — lobby, join,
  orders, 12 s connection cut → reconnected in 0.7 s with army and money matching, settle checks all clean.
- Multiplayer through the real buttons (`qa-mplobby.mjs`): desktop host presses HOST A GAME → phone sees the game in
  Open games → taps JOIN → host presses ▶ START 2-PLAYER BATTLE → both load → phone taps own truck + ground → the move
  order arrives on the host. (Under SwiftShader both pages showed "Connection to the host lost. Reconnecting… /
  Reconnected" twice in the first seconds; frames take seconds headless, so this is probably a test artifact.)
- AI that takes over a slot after 2 idle minutes (the dropped-player path) still builds 85–96 units and fights.
- Balance probe (headless, Medium AI vs AI, Desert Strait, 15 game-min, 3 seeds × 10 nation pairs, each pair played
  from both starts): the player in start slot 0 won 19, slot 1 won 10, 2 unfinished. E.g. Mountain Shias beat the US
  3/3 from slot 0, lost 2/3 from slot 1. Might be a start-position edge on Strait (or AI update order); for the
  Battlefield squad to check, not a confirmed bug.
- Anthems: only 8 of 18 nations have one (US EU IL UA CU IN CN EG); the others start silently — known (BACKLOG).

## Re-checks of origin/main
- 08:23 UTC: no new commits on main since 1639dab.
