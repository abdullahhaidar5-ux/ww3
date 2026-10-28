# QA playtest report — 2026-10-28

**Summary (12:00 UTC):**
1. **High — friends can't join by pasting the invite:** the box cuts it to 40 chars and the parser picks the word "battle" (or "github" from a link) as the game code (Q1).
2. **Multiplayer lobby/reconnect gaps:** a phone that reloads mid-battle gets no Rejoin (works only by retyping the code); a friend in a lobby has no Leave button and "Host a game" is dead (Q2, Q3).
3. **Wrong defeat text:** losers read "The last enemy capitulated…" (Q4); phone landscape build bar still hides a 5th column under LAUNCH (Q5); settings overlay/Done overlap and cut names at 1366×768 (Q6, Q7).
4. **Works:** full skirmish loop on 1920/1366/phone portrait/landscape, all 18 nations (8 maps, headless), victory/defeat/elimination screens, ☰ settings/graphics/mouse schemes/restart/quit, Test Range, 2-player online through local servers incl. 12 s cut-and-reconnect; gate scripts controls 43/43, audio PASS, touch 71/71 run.
5. Re-checked main hourly (1639dab → 8e5ad4d): phone button names now wrap (Q10 fixed); no new console errors; 11 reusable `orch/qa-*.mjs` scripts left for the next pass.

Tested build: `origin/main` 1639dab (re-checked hourly, see "Re-checks" at the bottom). Headless Chromium with
SwiftShader (CPU WebGL), so absolute frame times are not meaningful — only spikes relative to the run.
Scripts (reusable, all serve the repo locally; multiplayer only against a local `wrangler dev`): `orch/qa-lib.mjs`
(shared setup + layout audit), `qa-menu.mjs` (menu/settings on 4 screens), `qa-play.mjs` (full player run: menu →
deploy → build → train → select/order → powers → battle to the end → Play again / Main menu / Quit), `qa-settings.mjs`
(☰ menu, graphics tiers, music, mouse schemes, restart, Test Range), `qa-mplobby.mjs` (2 players through the real
lobby buttons + reload mid-battle), `qa-joincode.mjs` / `qa-paste.mjs` (join-by-code inputs), `qa-win.mjs` (victory),
`qa-aitake.mjs` (AI taking over an idle slot), `qa-joinlink.mjs` (#join= invite link), `qa-phonemusic.mjs` (music on a phone).

## Findings (most severe first)

### Q1 · Pasting the host's invite message into "Join by code" joins game "BATTLE" — High
- Steps: host presses Host a game → COPY INVITE → sends it on Discord. Friend opens the game (GitHub Pages edition),
  Multiplayer, pastes the message into the "Game code or invite link" box, presses JOIN BY CODE.
- Expected: joins the host's game (the message contains "enter game code K7P2XQ").
- Actual: "No open game with code BATTLE was found." Two causes (`07-net.js codeFrom` + the input in `index.html`):
  1. the box has `maxlength="40"`, so the pasted message is cut to "Join my World War 3 battle! Open http://";
  2. even the full text parses wrong: `codeFrom` takes the first 6-letter word, which is "battle" (from "Join my World
     War 3 battle!"), before ever reaching the real code.
  A pasted invite *link* has the same problem: `https://abdullahhaidar5-ux.github.io/ww3/#join=abc123` is cut at 40
  characters, then "github" is taken as the code ("No open game with code GITHUB"). The error message itself tells
  players to "Paste the invite", so this is exactly what friends will do. Opening a `…/index.html#join=<code>` link
  does work (tested: `orch/qa-joinlink.mjs`, the phone joined the lobby by itself) — but the GitHub Pages invite text
  doesn't contain such a link, only "open <site>, go to Multiplayer and enter game code X".
- Fix idea: drop/raise the maxlength, and prefer `join=…` or the token after "code" (or an all-caps 6-char token)
  over any 6-letter word; and put the `#join=<code>` link into the Pages invite text (one tap to join).
- Repro: `node orch/qa-paste.mjs` (prints the parsed code), `node orch/qa-joincode.mjs` (status texts on a phone).
- Screenshot: `orch/shots/qa/joincode-wrong-phoneP.png`


### Q2 · Multiplayer: a phone that reloads mid-battle gets no Rejoin — only works if they know the game code — Medium
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


### Q3 · Multiplayer lobby: a friend who joined can't leave, and "Host a game" is a dead button — Medium
- Steps: friend taps JOIN on an open game (phone 390×844 and 844×390 seen; desktop the same code path).
- Expected: a "Leave" button; Host a game hidden or disabled while in someone's lobby.
- Actual: status "Joined… Waiting for the host to start the battle…", no Leave/Cancel button anywhere; HOST A GAME
  stays bright and enabled but does nothing when pressed (`hostGame` returns because `NET.code` is 'join'); the
  game's JOIN button is disabled but still drawn bright green. The only way out is reloading the page. The host's
  lobby (phone and desktop) keeps saying "Your game is open. Waiting for players to join…" next to "2 / 8 players".
- Repro: `node orch/qa-mplobby.mjs --client phoneP --lobby-only`
- Screenshots: `orch/shots/qa/mp-client-joined-phoneP.png`, `orch/shots/qa/mp-client-joined-phoneL.png`,
  `orch/shots/qa/mp-host-lobby2.png` (host on a phone)


### Q4 · Defeat screen says "The last enemy capitulated" when YOU lost — Medium
- Steps: skirmish 1 vs 1 AI, lose (all your units/buildings destroyed). Seen: Mountain Shias vs US on Zagros, 1366×768.
- Expected: something like "You have been wiped out: every unit and building destroyed. United States won."
- Actual: "DEFEAT — The last enemy capitulated: every unit and building has been destroyed. United States won."
  From the loser's side the player *is* the "last enemy"; reads like you won. (`03-sim` endGame reason
  `The last enemy capitulated: …` is shown to every player regardless of side; `08-ui showEnd`.)
- Screenshot: `orch/shots/qa/hd-RS-zagros-1-end.png`


### Q5 · Phone landscape (844×390): build grid's last column is cut off under the right-hand panel — Medium (still on 8e5ad4d)
- Steps: phone held sideways, start any skirmish (seen: Coffee Shias, Golan Heights, 3 AI) → Build tab.
- Expected: whole buttons (the portrait bar was fixed to show exactly 4 whole columns on 2026-10-27).
- Actual: a 5th column ("Tu…", "Lo…" = Tunnel / …) peeks out and disappears under the strike/"LAUNCH" panel; the
  layout audit finds the Command HQ button underneath the LAUNCH button. Names in the visible columns are also cut
  ("Coffee Ro…", "Defense …", "Supply D…").
- Screenshot: `orch/shots/qa/phoneL-DW-golan-3-start.png`; re-check on main 8e5ad4d (names now wrap, but the
  5th column "Tur… $57…", "Mo… Ro… $23…" is still cut under the LAUNCH panel): `orch/shots/qa/phoneL-RS-dmz-recheck-start.png`


### Q6 · Settings screen: menu text shows through, "Done" floats over options (1920×1080, 844×390) — Low/Medium
- Steps: main menu → Settings.
- Expected: settings readable on their own background; Done button not covering anything.
- Actual: the main menu (nation cards) is visible through the settings overlay, so settings text sits on top of
  other text (hard to read on 1080p). The sticky "DONE" button sits on top of the "Scroll when the mouse touches the
  screen edge" On/Off buttons (1920×1080) and on top of the Soundtrack / Import music buttons (phone landscape) —
  you must scroll past it to reach them.
- Screenshots: `orch/shots/qa/settings-fhd.png`, `orch/shots/qa/settings-phoneL.png`


### Q7 · Command bar names cut off at 1366×768 — Low (still on 8e5ad4d; the wrap fix is phones-only)
- Steps: start any skirmish as Mountain Shias (long names) at 1366×768 → Powers tab.
- Actual: faction name shows "MOUNTAIN …", the strike power "Mountain …", powers "Mountain Wat…",
  "Tunnel Works…", "Hidden Fight…", "Labbayk Ya H…" (the war slogan is cut in half). A player can't read what
  they're unlocking without hovering.
- Re-check 11:05 on 8e5ad4d, Mountain Shias at 1366×768, names whose text doesn't fit: Build "Khums Treasury",
  "Mountain Rocket Silo"; Units "Construction Vehicle", "Mountain Guard", "Mountain RPG Team", "Mountain Rocket Team",
  "Armed Technical", "Medium Rocket Launcher", "Fast Attack Skiff"; Powers "Mountain Watchers", "Tunnel Workshops",
  "Labbayk Ya Hussein"; plus the faction name and strike name in the side panel. (Phone landscape: none cut now.)
- Screenshots: `orch/shots/qa/hd-RS-zagros-1-powers.png`, `orch/shots/qa/names-hd-units.png`


### Q8 · Main menu still has "Host a game" button and "Host one…" wording — Low (known, in progress)
- Standing decision (2026-10-27 19:30): one "Play online" button, no hosting button or wording. Live `main` still shows
  "HOST A GAME" + "No open games right now. Host one, or type a friend's game code below." on every screen.
  BACKLOG says `orch/play-online` is on it — listed so it's re-checked when that ships.
- Screenshot: `orch/shots/qa/menu-fhd.png`


### Q9 · Phone portrait: Deploy button is ~3.5 screens down the menu — Low (UX)
- Steps: open the game on a 390×844 phone.
- Actual: menu is 3077 px tall; to start a battle you scroll past all 18 nation cards (the selected one expands to a
  long paragraph), the map picker, and 5 option rows. No sticky Deploy button. Friends on phones may not find it.
- Screenshot: `orch/shots/qa/menu-phoneP.png`

### Q10 · Phone portrait: most build/unit/power names are cut to a few letters — Low · FIXED on main 8e5ad4d (names wrap to two lines)
- 390×844, Iran: "Saffron B…", "Defense G…", "Supply De…", "IRGC Fiel…", "Construct…", "Spoils of …", "Takavar D…",
  "Missile Sa…", "Shahed S…", and the cost line "Unlock · 1 …". Players have to guess what a button builds.
- Screenshot: `orch/shots/qa/phoneP-IR-strait-1-powers.png`, `orch/shots/qa/phoneP-IR-strait-1-units.png`


### Q11 · 8-player battles cost a lot of CPU for the simulation alone — Info (perf)
- 1920×1080, North Korea + 7 AI on Fulda Gap: the battle simulation took ~7–8 ms per 60 Hz step in Chromium on this
  2-core machine (≈ 0.45 s of CPU per game-second, before any drawing), one step peaked at 264 ms around 13 game-min.
  Desktops will cope; a mid-range phone hosting (or playing) an 8-player battle likely can't hold full speed. Worth a
  phone measurement by the Battlefield/Netcode squads before friends try 8-player games on phones.
- Screenshot: `orch/shots/qa/fhd-KP-fulda-7-start.png`

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

- Settings in battle via ☰ (hd): graphics Low/High/Auto keep drawing; Music on/off toggles; Generals left-click
  ground moves; Alternate mouse setup → right-click moves (left-click ground deselects); back to Generals works;
  ☰ Restart → confirm → fresh battle; Test Range opens with ∞ money and its panel; ☰ Quit → menu.
- All 18 nations in 4-player AI battles on 8 maps (headless, 12 game-min): no errors, every battle progressed
  (7 ended with a winner, DMZ still 2 sides fighting).
- Join by code: empty box and a wrong code give clear messages.
- Phone music (normal autoplay rules, 390×844): silent until the first tap, then the menu track plays; in battle the
  calm soundtrack takes over (Egypt; menu track was still on 8 s after the loading screen under SwiftShader — slow
  frames, probably a test artifact; `audio.mjs` on current main: AUDIO PASS). (`orch/qa-phonemusic.mjs`)
- 1366×768, Egypt + 2 AI on Nile & Suez: build/train/select/order flow works.
- Victory path (phone 390×844, you + an AI ally vs 2 AIs on Fulda): "VICTORY — … Your alliance (Iran, North Korea)
  won." with Play again / Main menu; Play again starts a new 4-player battle. (`orch/qa-win.mjs`)
- Gate scripts on current main: `controls.mjs` CONTROLS PASS 43/43 (all Generals mouse actions, Alternate setup,
  phone taps); `touch.mjs` 71 checks passed, 0 failed (portrait + most of landscape; I stopped it at my 25-min limit).
- 1920×1080, North Korea + 7 AI on Fulda: loads in 49 s, build/train/order all work, the elimination screen ("North
  Korea has capitulated… 6 rivals still fighting") offers Keep watching / Play again / Main menu.

## Re-checks of origin/main
- 08:23 UTC: no new commits on main since 1639dab.
- 09:52 UTC: main at 8e5ad4d (phone button names wrap; map picker terrain line; gate mpsync-server reconnect). Merged into orch/qa. Re-checked phone landscape: Q3b still there, Q3c fixed in landscape too; phone ❚❚ → Quit battle → menu works.
- 11:09 UTC: no new commits since 8e5ad4d. Re-checked Q7 (still cut at 1366×768) and Q5 (still cut on phone landscape).
