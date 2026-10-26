# Backlog — organized by squad

ORCH picks from the top of this file each cycle. Status tags: **[open]** confirmed not in the live code ·
**[check]** carried over from old rounds, may already be done — verify in `src/` first, then do it or mark done ·
**[ask]** needs a decision or access only Abdullah has.

## ★ Requests from Abdullah (always first)

Add new requests here (or tell Claude in any chat to add them). ORCH does these before anything else.

- _(none waiting)_

## Questions for Abdullah

1. **[ask] Right-click.** Old runs were told "left-click only, never reintroduce right-click", but the live build
   still has right-click move/attack, line formation and special-action hints ("Right-click an enemy building…").
   Keep right-click as an optional shortcut, or remove it everywhere?
2. **[ask] 18 or 19 factions?** Memory says 19; the live game has 18 (IM was removed in v84). Is a 19th planned?
3. **[ask] Old session's files.** The run #5 backlog (ROUNDS.md), the model `assets/` and the test harnesses live
   only in the old development chat. If it still exists, ask it: "push ROUNDS.md, assets/ and all test scripts to
   the ww3 repo under orch/legacy/". Without `assets/`, 3D models can't be re-packed (ORCH can still edit all code).
4. **[ask] Two copies of the game.** GitHub Pages (`main`) is what friends play; the old artifact
   (claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi) was the runs' publish target. ORCH ships to Pages. Keep the artifact
   in sync too, or retire it?

## P1 — now

**Foundation (ORCH itself)**
- [open] Multiplayer sync test in the gate: host + client in two headless pages over a local transport, assert no
  errors and matching unit positions (replaces old `t8.py`). Highest-risk area with no automated check today.
- [open] Map sweep: smoke every map in `MAPS` at 2, 4 and 8 players; fix any that fail.
- [open] AI-vs-AI tournament harness (all 18 factions, headless, sim-only) → win-rate table for balance.

**Battlefield & AI** (`03-sim`, `01-data`)
- [open] "Massive columns" scale: profile a 4–8 player late game; raise practical unit counts without dropping
  below 30 FPS on mid hardware (pathfinding, `nearby()` hash, render instancing).
- [check] AI uses flanking and cover (DIFF has `flank`/`retreat` params) — verify in battles, strengthen on Hard.
- [check] Stuck/idle units after long games (old `aiall.py` checked this).

**Visuals** (`04-gfx`, `05-fx3d`, `10-post`, `11-models`)
- [open] Helicopter rotor-wash dust when hovering low.
- [open] Naval wakes behind boats and ships.
- [open] Ricochet sparks when small arms hit armour.
- [open] Time-of-day/lighting variety per match (golden hour, overcast, dusk) — recordings had it, the game doesn't.

**Audio & voice** (`09-audio`, `vo/`, `mus/`)
- [open] Full native-language unit responses per nation (select / move / attack / under fire / unit lost), recorded
  quality, not browser text-to-speech. `vo/` holds one clip per nation today.
- [check] Latmiyas for IR, RS, DW and a distinct war score for every other nation — `mus/` has one file; verify each
  nation really gets its own track and upgrade quality.

## P2 — next

**Visuals**
- [check] Muzzle-flash and impact-spark polish.
- [check] Battlefield debris near roads: shell casings, burnt patches (some debris exists).
- [check] Bridge guard rails and lamp posts look too modern.
- [check] Tree canopies a little faceted up close.
- [check] Shoreline foam variation on water.
- [check] Sandbags/props around buildings (sandbag model exists — check placement).
- [check] Infantry helmet/kit variety beyond v68 tone variation.

**UI/UX & controls** (`08-ui`, `06-view`)
- [open] Phone-playability pass: touch select/move/attack, sidebar layout at phone width, mobile GPU performance.
- [open] Control hints match whatever is decided in Question 1.
- [check] Settings menu completeness (graphics, volumes, speed, HUD).

**Multiplayer** (`07-net`, `07b-ckpt`, `relay-worker.js`)
- [open] Review the ~5% of `testbed` netcode lines not in live; merge what's still useful, then mark `testbed`
  superseded (don't delete it).
- [ask] Cloudflare relay: needs Abdullah's Cloudflare account to deploy `relay-worker.js` and set `RELAY_CF_URL`.

**Maps** (`02-map`)
- [open] Map-select screen previews (thumbnail per map).

## P3 — later

- Campaign or scenario missions; tutorial; replays; spectator mode for MP.
- Clip/showcase pipeline rebuilt in `orch/` so ORCH can post short phone-friendly clips of new features.

## Done

Moved here by ORCH with date and version. Full pre-ORCH record: `orch/HISTORY.md`.
