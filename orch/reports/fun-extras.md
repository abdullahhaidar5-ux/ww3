# fun-extras: friend invites, kill-cam highlights, Encyclopedia (2026-11-06, orch/fun-extras)

Abdullah's 2026-11-05 18:43 picks. UI only (no 03-sim / 01-data / 02-map change). 07-net changed for lobby messages only, plus 3 small
server lines (see "servers-live" below).

## 1. Friend battle invites (`src/08d-lobby.js`, hooks in `src/07-net.js`, `join.html`, `og-invite.jpg`)
- **One link.** The invite is now `https://…/ww3/join.html#join=CODE` (password games: `&pw=…`, fragment only as before). `join.html` is a tiny static
  page with its own Discord/Twitter card ("You're invited to a World War 3 battle", 1200x630 `og-invite.jpg`), then forwards to the game with the
  same `#join=` fragment. The game opens **straight into the lobby**: a full-screen "Joining your friend's battle CODE…" screen that turns into the
  lobby as soon as the friend has joined (no menu, no typing a code). Typed codes / old links (`index.html#join=`) still work.
- **Guest lobby** (overlay): everyone in the lobby with nation + team, each friend's **Ready / Not ready** chip. The friend picks their own
  **nation** and **team** from two drop-downs, and presses **I'm ready** (toggle). Leave lobby button.
- **Leader's lobby** (existing host screen): each friend row shows ✔ Ready / Not ready; the **Start button only lights up (green glow) when every friend
  is ready**, otherwise it is disabled with "Waiting for N friends to press Ready…". A small **Start anyway** button is always offered so a leader is
  never stuck (e.g. a friend away from the keyboard). Computer players need no Ready.
- **Wire:** guests send one `pick` event `{f nation, t wanted team, r ready}`; a browser-hosted lobby answers everyone with a `lobr` roster; a Cloudflare
  battle carries it in the lobby blob (`seats[].r`). Old pages ignore both. Setting a nation in the lobby also sets the player's menu nation.
- **servers-live PR needed** for Cloudflare battles: `server/src/battle.js` got `pick()` (nation/team/ready) and `seats[].r`. Until it is deployed the
  leader's Start never waits (a seat without `r` means "server does not know Ready"), friends can still pick nation and press Ready, nothing breaks.
- Test: `node orch/lobbytest.mjs` (LOBBY PASS; local game server, two browsers). Screenshots `orch/shots/fun-extras/lobby-*.png`.

## 2. Kill-cam highlights (`src/08e-highlights.js`, hooks in `src/08-ui.js`)
- While a battle runs, the kill-cam's rolling notes now also catch **moments**: a big **multi-kill** (6+ units / $900+ lost within 3 s, as your side saw
  it), a **missile strike or special power landing**, a **base building falling** (anything costing $1000+: HQ, factory, airfield, strike centre…),
  a **town revolt**, a **hero ability**. Each keeps the ~6 s around it (3.5 s before, 2.2 s after).
- **End of match:** the old single "biggest moment" replay is now a reel of up to **three highlights** (best of each kind first, shown in the
  order they happened, slow motion around the peak, "Highlight 2 of 3 · Base building destroyed: Command HQ · 14:02"). Skip skips the whole reel.
  With no highlights noted it plays the old single biggest-fight replay.
- **Mid-match toast** "★ Highlight saved · …" (2.6 s, top centre) for the big ones; `localStorage ww3_hltoast=0` turns it off.
- **Save clip** records the whole reel (cap 26 s, 4.5 Mbit/s); the saved picture is captioned with the best highlight.
- Test: `node orch/hltest.mjs` (HL PASS). Screenshots `orch/shots/fun-extras/highlight-*.png`.

## 3. Encyclopedia (`src/08f-encyclopedia.js`)
- Main menu button **Encyclopedia** (next to My battles). Every unit and building of **all 18 nations** (~450 entries) with a rotating **3D view**
  (drag = rotate, wheel = zoom, auto-turns when idle) built by the game's own object builder (`makeObj`) for a stand-in team, in its own small
  renderer; game state is never touched.
- Facts read from 01-data (`stats()` / `bstats()`): cost, build time, health, armour, speed, weapon (damage per shot, per second, range, blast radius,
  what it hits), the nation's doctrine/courage, counters (the game's own rock-paper-scissors text), the unit's own description, plus a short generic
  **real-world note** per unit class and building (no real people named). Search box, nation drop-down (or all nations), type chips
  (Infantry / Vehicles / Aircraft / Naval / Buildings). Esc or Close leaves.
- Models load per nation on first look (a few seconds on a slow link; the entry redraws when they arrive).
- Test: `node orch/enctest.mjs` (ENC PASS). Screenshot `orch/shots/fun-extras/encyclopedia-ir-tank.png`.

## Notes / not done
- The leaderboard etc. are untouched. Phones not considered (PC only).
- Software-GL test machines are slow: the new tests stub drawing where a frame is not needed.
