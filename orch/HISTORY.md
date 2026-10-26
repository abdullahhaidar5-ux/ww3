# History — every agent run and what it shipped

Reconstructed on 2026-10-25 by ORCH from the scheduled-task records of all past chats, the `testbed` branch and the
live build. Before ORCH, work ran as self-rescheduling "rounds" inside one long chat (session
`session_01NYN6pWTrTJTmBddAW2fZh4`, linked to LAPTOP-26MKDH7J). That session kept its sources (`v3/`), model
assets (`assets/`), test harnesses and a `ROUNDS.md` change log in its own private workspace — none of that was in
the repo. ORCH recovered the up-to-date game sources from the live `index.html` into `src/` (byte-identical
rebuild), so the repo is now the single source of truth.

## Agent runs (all finished; none still scheduled)

| # | When (UTC) | Name | Cadence | Focus | Output |
|---|---|---|---|---|---|
| 0 | Oct 18 21:21 – Oct 19 01:21 | WW3 graphics hourly check-in (4 rounds) | hourly | graphics | screenshots each hour |
| 0b | Oct 19 03:32 – 04:18 | WW3 continuous graphics work | 45 min | graphics | clip every 4 h |
| 1 | Oct 19 12:00 – 17:41 | WW3 graphics round (cycle from 07:00 Chicago) | 2 min back-to-back | graphics v58–v63 | 30 s clip at 16:00 |
| 2 | Oct 20 12:04 – Oct 21 12:00 | 24-hour development run + clip backstops + safety net | 2–30 min | graphics v64–v71 | 45 s clip every 4 h |
| 3 | Oct 21 01:15 – Oct 22 01:15 | 24-hour development cycle #2 | ~30 min | graphics + controls v72–v75 | 45 s clip every 4 h |
| 4 | Oct 21 12:55 – Oct 22 13:00 | Development run #3 | ~30 min | graphics, gameplay, speech v76–v84 | clips on the "World War 3 Clips" page |
| 5 | Oct 22 01:28 – 10:00 | Overnight run #4 | ~30 min | rotation: graphics, mechanics, audio, gameplay, map select, unit art, faction art, music, menu settings, tactics | clips 05:30 / 09:30 |
| 6 | Oct 23 18:00 – 22:30 | Development run #5 | ~30 min | Abdullah's run-5 backlog (lived in that session's ROUNDS.md) | one summary |
| 7 | Oct 25 14:04 – 14:33 | `testbed` branch | — | netcode: P2P transport, per-player event filtering, host-migration checkpoints | ~95% merged into live |
| 8 | Oct 25 | main | — | GitHub Pages hosting, PWA install/offline, host-in-background worker, host tune-up tools, Cloudflare relay, "Radwan Training" name restored | live |

Published game artifact used by runs 1–6: https://claude.ai/artifact/Qt3bimPhr31eZEUpqndGUi ("World War 3").
Clip page: https://claude.ai/artifact/NqbVv2hseRUctmafy3AFC2 ("World War 3 Clips").

## Shipped improvements by version

**v58–v63 (Oct 19)** — finer grass tufts, scattered stones, vehicle camo pattern · paler sun-bleached terrain,
weathered lighter rocks, removed green blob shrubs · two-track dirt roads with wheel ruts, broken-up leafy acacia
canopies with shaded undersides, wispier grey wreck smoke · windblown sand over concrete base pads, dappled canopies ·
weathered/grimier buildings, muted team trim, regional building tints (US/EU/KR) · short warm-orange tracers.

**v64–v71 (Oct 20)** — lighter grey-brown explosion smoke, low rolling ridges, finer terrain mesh, grey wreck-smoke
columns, neutral fog of war (v64) · tank stowage/antennas on the real rear deck (v65) · sunlit smoke and dust, pale
sandstone slopes, softer cloud shadows, rising damage smoke (v66) · weathered bridge deck with drifts, cracks,
potholes, faded markings; warmer building walls (v67) · thin whip antennas, fainter team rings, soldier tone
variation (v68) · thinner greyer smoke, warmer sand-bounce fill light (v69) · ragged-edged smoke/dust puffs, lighter
exhaust, gentler dunes, milder slope darkening (v70) · brighter teal river with turquoise shallows (v71).

**v72–v75 (Oct 21)** — left-click controls; helicopter flies nose-first; softer acacia canopies (v73) · 8-player
multiplayer, native-language voices, national flags/camo/uniforms, realistic vehicle motion, destructible oil
derricks (v75).

**v76–v84 (Oct 21–22)** — stronger national vehicle paint (Russian/Chinese green vs US/Gulf tan) (v76) · badly
damaged buildings burn: roof/wall fires, sparks, black smoke, firelight (v77) · killed soldiers topple and lie
~15 s instead of vanishing (v78) · helicopter rocket salvos with smoke trails, walking cannon bursts (v79) ·
deterministic map seeds for recordings · Construction Vehicle + build anywhere, buildable Command HQ, 10 maps
(strait, rivers, delta, oasis, gulf, plateau, hormuz, arctic, islands, zagros), unique national scores, natural
voice preference, factions renamed (RS "Mountain Shias", DW "Coffee Shias"), IM removed (v84).

**Oct 22–23 (runs #4–5, detail lived in ROUNDS.md)** — work across mechanics, audio, map selection, unit and
faction art, music, menu settings and tactical realism (flanking, cover). The live build shows the results:
dynamic weather per theatre, national specials, doctrines, upgrades, national powers, general ranks, veterancy,
courage/morale and suppression, garrisoning, the Ayatollah unit for Shia factions, latmiyas, voice slogans.

**Oct 25** — P2P netcode with per-player event filtering and host-migration checkpoints; host keeps the battle
running when its window is hidden; battery and wake-lock handling for hosts; GitHub Pages + installable PWA;
Windows host tune-up scripts; Cloudflare relay worker; "Radwan Training" restored.

## Test harnesses the old runs used (not in the repo)

`audit.py` (unit mechanics), `aiall.py` (AI games, stuck units), `t8.py`/`t6b.py` (multiplayer sync), `sbtest.py`
(sandbox), `maptest.py` (maps), `shotf.py`/`shot2.py` (screenshots), `rec.py`/`rec2.py` + `raudio.py` + `mix.py` +
`phone.sh` (clips). ORCH replaces the core of these with `orch/smoke.mjs`; the rest should be recovered from that
session if it still exists, or rebuilt in `orch/`.
