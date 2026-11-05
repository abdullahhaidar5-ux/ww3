# Tactics: digging in + vehicle damage (2026-11-05, helper agent `orch/tactics`)

Abdullah approved both parts on 2026-11-04 19:38. Code: `src/03b-tactics.js` (sim, shared), `src/05b-tactfx.js` (3D), `src/08c-tactui.js` (buttons, hotkey, two-click line placement), plus small hooks in 03-sim, 06-view, 07-net, 07a-hostsnap, 07b-ckpt, 08-ui. Test: `node orch/tacttest.mjs` (boots a battle, drives the sim, checks 17 things, `SHOTS=foxholes,lines,tank,tank-selected,phone,phone-dozer` for screenshots; each screenshot takes minutes under SwiftShader).

## 1. Digging in
- **Foxholes:** select infantry, press **I** (or the *Dig in* button / touch strip button). 4 s standing still (they keep firing, a move order cancels), then a foxhole appears under them. Soldiers sink ~3 units into it (render only; clients work it out from the synced list) and take about half damage (0.5x bullets, 0.7x shells; shown as **DUG IN**).
- **Sandbag lines / trench segments:** select a Construction Vehicle (the only builder unit; there are no engineers), press **I** (again for trench) or use *Sandbags* / *Trench* buttons, then click/tap the start and the end of the line (two clicks, so it works on touch; right-click / Esc / the strip button cancels). Up to 10 pieces along the line, paid per piece (sand 35, trench 70), built one after the other (3 s / 5 s each). Sandbags: 0.64x damage (cover); trench: like a foxhole.
- **Cover:** `coverAt()` now returns 1 inside any fortification, so AI cover-seeking, morale and suppression all use it. `tactic()` gives the extra damage cut.
- **Vehicles:** half speed while crossing a line/trench; tanks and heavy vehicles flatten sandbags/trench (70 damage/s of contact); shells, bombs and missiles destroy them (`explode()` -> `dugBlast`, 150-320 HP each). Max 150 pieces per battle (oldest of the same team is replaced).
- **AI:** idle infantry (7+ s standing still, no order/target) dig in, max 28 holes per team; idle Construction Vehicles of AI (Normal+, after minute 4) lay a 4-piece sandbag line (trench on Hard with money) across the approach in front of a base building, max 14 pieces per team.
- **Look:** one instanced mesh of irregular earth/sandbag blobs (`rockGeo`, never cubes), rebuilt only when the list changes; 1 draw call; low-poly on phones.
- **Sync:** fortification list `dg` rides in the team panel when it changes (+ every 12 s); host-migration checkpoint carries `dug*`; new commands `dig`, `wall`, `fix` appended to `CMD_T`. `03b-tactics.js` is added to `SIM_FILES` in `orch/headless.mjs` (so the Cloudflare server and node tests include it).

## 2. Vehicle damage
- **Crits** (tanks, IFVs, APCs, trucks; not harvesters): after a damaging hit, seeded roll (map seed, unit id, tick): front 5%, side 17%, rear 30% (splash/bombs 10%; rifle fire x0.15; scaled by hit size). Outcomes: **tracks/wheels out** (cannot move), **turret jammed** (traverses 5x slower, fires 1.6x slower; only armed vehicles), **engine fire** (1.2% HP/s for 10-16 s, speed x0.6, never kills by itself, floor 5%). Floating text "TRACKS OUT" etc. and a log line for the owner.
- **Bail-out:** below 20% health the crew leaves (previously only when morale broke); transports unload first. The crew soldier runs for base and is removed after 16 s, at most 4 visible crew per team at once (no pile of free infantry, and the smoothness gate's draw-call count stays in range). The hulk stays; own infantry re-crew it (existing mechanic) and it comes back at 25% health, so it does not instantly bail again (8 s grace).
- **Repair:** Construction Vehicles fix criticals on their own when idle within 300 units of a damaged friendly vehicle (fire first, then tracks, then turret; 3.5 s each; works on hulks too), or on order (*Fix vehicles* button in the command bar; on touch it is automatic, the strip only has Dig in). A vehicle parked at its own war factory / HQ yard repairs one critical per 7 s. AI Construction Vehicles do all this by themselves; the AI re-crews as before.
- **Display:** icons on the health bar (orange track, blue turret, red flame), a "Damaged" line on the unit card, engine smoke, flames, a broken track lying behind the vehicle. Bits ride in the unit snapshot (high bits of the morale field: `x=(morale+1)+128*crit`).

## Checks
`node orch/tacttest.mjs` 17 checks pass (foxholes, cover, sink, damage, sandbags + trench, slowdown, shell destroys, net pack round trip, rear >> front crits, immobile, fire, crit bits in snapshot, jam, bail-out, re-crew, field repair). Screenshots in `orch/shots/tactics/`.

## Balance check (AI tourney, 153 games each, Normal AI, `--rounds 1`)
With tactics: IR 82, EU 71, SA 65, KP 59, KR 59, EG 56, CU 56, RS 56, AE 53, IN 53, US 47, UA 44, DW 44, RU 41, TR 38, PK 35, CN 24, IL 18.
Same run on `main` without tactics: IR 76, CU 74, EU 62, AE 62, RS 62, UA 59, EG 59, DW 59, US 53, PK 47, RU 41, SA 41, KP 41, TR 38, KR 38, IL 35, IN 35, CN 18.
Only 17 games per nation, so +-12 points is noise; the same nations sit at the extremes in both (IR high, CN low), i.e. not caused by tactics. IL fell 35 -> 18 and is the one to watch in the next full 306-game pass. No tuning done.

## Gate notes
`gate/smooth-pc` drew 1893 / 1780 calls with an earlier version (limit 1725): the extra was crew soldiers from the new bail-outs, now capped at 4 per team and removed after 16 s; broken tracks live in the same single instanced mesh as the foxholes. `gate/controls` caught the extra touch-strip button pushing Cancel off a phone screen: the Dig in button is now hidden while Cancel shows.
