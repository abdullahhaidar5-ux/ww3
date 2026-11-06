# HANDOFF — savegame (branch orch/savegame, 2026-11-06)

Abdullah 2026-11-05 18:51: "Make it so a game can be saved."

## What is built (all in `src/08d-save.js` + small edits to `07b-ckpt.js`, `08-ui.js`)
- **Save** (pause menu → "Save game"): name box + list of existing saves (same name asks "Overwrite?" first), "Download save" (.ww3save file).
  **Autosave** every 3 min of real play into one rotating "Autosave" slot, in an idle callback (`ckEncode` takes ~5 ms for a 300-unit battle; compression + IndexedDB are async).
- **Load**: main menu has **Continue** (latest loadable save) and **Load game** (list with minimap thumbnails, Load / Download / Delete with confirm, "Load from file…").
  Loading = `newGame(saved args)` → `ckRestore(checkpoint)` → normal loading screen → starts **paused** ("Game loaded. Press P to continue.").
- Storage: IndexedDB `ww3-saves` (`meta` = list, `data` = packed checkpoints). Blocked storage → clear message + "Download save instead".
- A save = checkpoint (`ckEncode`, now v2) + `ck.sv` {me, newGame args (`G.ng`, remembered by a wrapper around `newGame`), camera, setup}. Squads are in the checkpoint (`G.sq`).
- Versioning: `meta.fmt` + `meta.pv` (= `NET_PV`) must match, plus `ck.v>=2` and known nations/map; otherwise "This save is from an older version and can't be loaded." Damaged / foreign files get their own message. Nothing is changed before the checks pass; a failure while loading returns to the menu.
- Single-player (Conquest skirmish and campaign missions) only. Test Range / replays / online battles cannot be saved (button explains why).

## Checkpoint audit (also fixes host migration)
Added to `ckEncode`/`ckRestore`: all town fields (tax rate, unrest, revolt timers, loyalty, garrison counts, rebel/militia unit links — were half missing and rebels/militia were dropped), full AI memory (`T.ai`: build index, wave, foe, timers — was rebuilt from scratch), projectiles in flight, missile/strike countdowns (`G.strikes`), campaign mission state (`G.camp`), clocks and timers (`todM, humA, rebT, radT, stT, gprT, supT, prT, pfTok`), Conquest setup timer (`setupEnd`), squads (`sq`), team upgrade caches (`_uk/_ut` — they can be stale on purpose), `_fc` (unit "recently fired" timer), roads (`lgd` + `lgSync()` after restore). Two identity checks the movement code relies on (`npW === path[0]`, `so === order`) are re-linked after restore.

## NOT saved (known gaps)
- `G.timers` (closures: the delayed parts of a few powers — napalm ticks, EMP/stun, smoke, militia drop — a save loses up to ~8 s of those).
- Fog "explored" memory: there is none in this game (fog is recomputed from units every frame), so nothing to save.
- Particle/FX state, selection, hovering.

## Multiplayer part (NOT done — spec for the next agent)
Goal: host may save; clients get a toast "Host saved the battle"; "Load game" on a multiplayer save starts a new online battle through the normal "Play online" path with an invite code; friends pick their old seat; empty seats run by AI.
1. Allow `svCanSave()` for `MODE==='host'` (and Cloudflare battles: the server holds the sim, so a save has to be asked from the server — probably needs a `save` request/reply message in the server's room protocol). Include `NET.startInfo` (`ck.start`) — already in `ckEncode`.
2. Host broadcasts a tiny event `{ev:'saved'}` through the existing event channel; clients `pushLog`/toast it.
3. Loading an MP save: call the same path as `launchMP()` (07-net.js ~198) but with the restored world: set `NET.startInfo` from `ck.start`, seats from `ck.teams[i].$ai`; players who join pick a free human seat (`slot`), remaining human seats get `mkAI(...)` (like `T.aiTook`, see 07a-hostsnap.js:33). `ckRestore()` already restores everything on a host page; the joiners then get a normal full snapshot.
4. `svLoad` currently forces `MODE='single'` — add a branch.

## Tests
`node orch/savetest.mjs [--pre 5] [--post 2]` (gate job `save`): battle 5 min → save → fresh page loads → same state hash after load → both run 2 more minutes with the same random numbers → hashes must match; reload page → Continue works; file round trip; old/damaged saves refused. Helpers in `orch/savelib.mjs` (deterministic mode: seeded `Math.random` that the game keeps references to, fake `performance.now`, particles stubbed, Three.js ids on their own random stream). `orch/saveshots.mjs` makes the screenshots in `orch/shots/savegame/`.
