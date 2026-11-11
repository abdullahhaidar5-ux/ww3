# Seamless flow (ideas 7–10) — helper seamless-flow

Spec: `orch/concepts/SEAMLESS.md` (branch orch/onelanguage), section "Flow side". Abdullah 2026-11-10 19:51 "All".
Pictures: `orch/shots/seamless-flow/` (1600x900; `before-*` = main at 0da5b4c, `s7-*` = slice 7). Harness: `node orch/seamlessflowshots.mjs <tag>`.

## Step 0 — how it worked before (main at 0da5b4c, 2026-11-11)

| | Conquest | Battle | Grand campaign |
|---|---|---|---|
| **Setup (single player)** | 4 menu screens: Battlefield → Nation → Players → Battle options (`src/14-menu.js`, moves the old controls `#pickP`, `#pickMap`, `#aiN`, `#diff`) | the same 4 screens, retitled (`mxSetMode`) | one overlay of its own look (`grandSetup` in `src/13c-grandui.js`): a drop-down for the nation, big green buttons for length and scenario, "Begin" |
| **Setup (online)** | Multiplayer screen → Play online; the nation and map are whatever was last picked in single player (no way to see or change them there); guests pick nation/team in the lobby (`08d-lobby`) | same, Conquest/Battle switch in the lobby | Multiplayer → "Create a campaign lobby" → the same overlay → campaign lobby (`gnLobby`, `13zn-gnet`) |
| **Remembered between visits** | only the map (`SET.map`); nation, opponent, count, difficulty reset to Iran vs United States on every page load | same | nothing (always Iran, Quick, Middle East 2026) |
| **One-click start** | none | none | "Continue" for a save only |
| **Automation** | auto-build panel (U): standing "keep N of unit X" orders, one on/off switch, a normal player order (`autoCmd`, `T.auto`, in the checkpoint + net) | same panel; supply trucks already loop on their own once sent | auto-resolve is chosen per battle in the battle prompt; no standing switch; no governors |
| **Links to another game** | end screen: Play again / menu only | same | battle prompt: Fight it live / Auto-resolve / Withdraw; no practice |
| **Stored preferences** | `ww3_settings` (`SET`: graphics, sound, mouse, map), `ww3_keys`, `ww3_medals` (medals + match history, colour, emblem → Extras → Profile), `ww3_audio` | same stores | campaign save `ww3grand1` + backups, `ww3_gcoach` (guide seen) |

Differences a player feels: the order of steps (map first vs nation only), the words (Players / Begin / Start battle), the controls (cards vs
drop-down), nothing remembered, and the online screen hiding what you bring.

## Slice 7 — one setup, same three steps (built, see below for status)

| Step | Conquest | Battle | Grand campaign |
|---|---|---|---|
| 1 | **Nation** (cards + search + detail panel) | same | **Nation** (same cards + search + detail panel; Observer is the first card) |
| 2 | **Battlefield** (cards, click to continue) | same | **World** (scenario cards, click to continue) |
| 3 | **Opponents** → Start conquest (Battle options = optional side screen) | **Opponents** → Start battle | **Options** (length) → Start campaign |
| First screen extras | Same again · Quick match | Same again · Quick match | Same again · Quick match |

- One step list per game (`MX_STEPS`, `MX_GSTEPS` in `src/14-menu.js`); the campaign's three screens are built by `grandSetup` with the
  menu's own helpers (`mxScr`, `mxFoot`, `mxBtn`, `mxLink2`), so it is the same header, crumb, Back/Esc, footer and buttons. The old
  overlay with the drop-down and "Begin" is gone.
- Last choices per game live in the existing settings store: `SET.last.conquest|battle|campaign`. They are put back through the real
  controls (nation card, map list, opponent, count, difficulty), so every rule those controls carry still runs.
- "Same again" starts the last setup of that game with one click (shown once there is one). "Quick match": the nation picked on the
  screen, a random battlefield, one computer on Medium (campaign: the real world of today, Quick length).
- Multiplayer: the screen now shows "Your nation … Change · Battlefield … Change"; Change opens the same Nation / Battlefield screen with
  "Done →", then returns. The campaign lobby (`gnLobby`) is reused untouched; its creation runs through the same three steps.
- View/menu only: no simulation state, nothing sent over the net.
- Guards: `orch/decisions.mjs` (block "SEAMLESS idea 7"); updated walkers `orch/menuflow.mjs`, `newplayer.mjs`, `grandlive.mjs`,
  `grandlive2.mjs`, `grandrt.mjs`, `obstest.mjs`, `gnettest.mjs` for the new order and the "Start campaign" button.
- What's new entry added ("One setup for all three games").
