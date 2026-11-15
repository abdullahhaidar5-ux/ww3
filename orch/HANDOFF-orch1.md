# Handoff: ORCH 1 → ORCH 2 (Sun 2026-11-15 04:15 Chicago)

Abdullah: "Can you transfer all your work to ORCH 2?" Everything ORCH 1 built is already on `main`; nothing is waiting in a sandbox. This file is what ORCH 2 needs to carry on.

## How ORCH 1 worked tonight (Abdullah's choices)
- **Push-fast:** changes go straight to `main` (update from main first, fast-forward, never force). Before each push check `gh run list --json name,status`: the latest "pages build and deployment" must be `completed` (every push cancels a build in progress). Do NOT cancel GitHub gate runs.
- **Servers:** sim changes (src/01*, 02*, 03*, 07*) need a manual server move (Abdullah approved): `git fetch origin +refs/heads/servers-live:refs/remotes/origin/servers-live; git checkout -B sl origin/main; git merge -s ours origin/servers-live -m "servers-live: <what>"; git push origin sl:servers-live`.
- **Helpers:** create_trigger (run_once_at far future) → fire_trigger. Abdullah turned down switching one helper's model to Sonnet, so the last few ran on the default (Opus).
- **Replies:** short, phone-friendly; ask him whenever something is unclear ("Confused ask me"). End visible ships with one 2-minute thing to try on PC + the link.

## Controls as of now (CLAUDE.md is updated)
- Left-click: select, press buttons, place buildings, place the rally flag (the building then lets go, so the cursor stops being a flag; Shift keeps it).
- Right-click: unit orders (move, attack, F/G targets, enter/leave); **generals' powers, the Strike LAUNCH and road jobs fire on RIGHT-click** (00:26 / 00:28); left-click or Esc cancels them. Guard `rclaunch` in orch/decisions.mjs.

## Landed tonight (ORCH 1 + its helpers)
- Command bar: Zero Hour-style order buttons (inline SVG icons, no flicker), Dig in = shovel, the dozer gets Cancel in place of Halt, Sell needs a second press to confirm, hologram portrait, upgrade/power icons (the bar's hide rule now spares `.zhIc`, guard `upgicons`), the alert icon no longer blows up to fill the screen.
- General window lists every power (it was empty unless the old Powers tab was open). Strike has its own rail button. Powers cost 1/2/3 points by strength and get visibly stronger each level (polish G).
- Multiplayer lobby: map dropdown works and no longer jumps; fits laptop screens. Test range map picker fixed; menu has a world-map background and the war-room look.
- Factions: realistic Palestine roster (polish F, src/01e-ob.js); Iran Zolfaghar Missile Launcher in place of the Shahed truck (src/01f-irbm.js); Ukrainian FPV team, Turkish Bayraktar TB2, AI builds the KN-25 battery, hidden firing posts hold 4 infantry (polish D); balance nudges after a tourney (orch/reports/balance-1115.md); per-nation economy (L3), signatures (L1), base styles (L4), unit looks (L5).
- Voices/quotes: own unit replies/radio/shouts for OB, RV, FR, DE, GB (quick Piper voices), the Lebanese RS sheets re-recorded with XTTS in heavy Lebanese dialect, and Palestine re-recorded with cloned voices (voices2 helper, in progress). Announcer clips en/fa/ar/ru/zh. Loading-screen quotes for OB, RV, GB, JP.

## Helpers still running (they land themselves)
- `trig_012SHXE3biRysWjNiBXappdo` mapfix2: Caribbean + Hormuz Gate still give start position 1 about 70% after mirroring; find the real cause, prove 40-60%, move the servers. Handoff will be orch/HANDOFF-mapfix2.md.
- `trig_01BByGUZUi8QWXusyuRTQvTz` voices2: gritty XTTS re-record of OB (first push already on main) then RV, then FR/DE/GB if time. Handoff orch/HANDOFF-voices2.md.

## Still open
1. Map fairness (above, mapfix2).
2. RV, FR, DE, GB voices still Piper until voices2 finishes; Japan has no unit replies (Piper has no Japanese voice); some national anthems missing (orch/HANDOFF-voicesV.md); Hebrew announcer is the device voice.
3. No full `orch/cigate.sh` run on tonight's changes (ORCH 2 owns the red checks, draw calls and save sync).
4. A full battle does not start in the cloud sandbox (times out); for UI checks ORCH 1 used headless Playwright on menu/lobby pages and small DOM tests (e.g. build a #panel button, run zhIcons, check computed styles).
