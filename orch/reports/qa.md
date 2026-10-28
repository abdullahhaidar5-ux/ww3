# QA playtest report — 2026-10-28

(in progress — summary goes here at 12:00 UTC)

Tested build: `origin/main` 1639dab (re-checked hourly, see "Re-checks" at the bottom). Headless Chromium with
SwiftShader (CPU WebGL), so absolute frame times are not meaningful — only spikes relative to the run.
Scripts: `orch/qa-menu.mjs` (menu/settings layout on 4 screens), `orch/qa-play.mjs` (full player run: menu → deploy →
build → train → select/order → powers → battle to the end → Play again / Main menu / Quit), shared `orch/qa-lib.mjs`.

## Findings (most severe first)

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

## Re-checks of origin/main
