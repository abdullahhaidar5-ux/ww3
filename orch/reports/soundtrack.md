# Soundtrack side lane — report (2026-10-27, branch `orch/soundtrack`)

**Situation:** steps 2–3 had already shipped on main (another chat, 5e5015b/1d90339). As the backlog asked, I merged
main, kept main's player and its `mus/st/` encodes, dropped this branch's own re-encode/player, and did step 4.

**What plays when** (unchanged from main): first tap → menu pool (menu-02, menu-04). Battle start → player's anthem,
then calm (calm-01/02/03/05); fighting heat ≥0.35 → combat (combat-01/02/05/06/09/11), 3 s crossfades, combat
holds ≥60 s, calm ≥30 s; no immediate repeats. Victory → victory-01, then anthem, then menu; defeat → defeat-02.
Each file is fetched only when about to play. My music, volumes, mute, ducking, iPhone unlock kept.

**Step 4 (new here):** score generator removed from `src/09-audio.js` (1443 → 420 lines); `mus/smp.mp3` and
me/as/we sheets + pack scripts deleted (−4.8 MB); anthems kept. Offline/unloadable tracks: music rests, retries after
2 min (no generated fallback any more). `mus/st/manifest.json` added,
checked by `build.py --check`.

**Tracks/licences:** Matthew Pablo, Alexandr Zhelanov (CC BY 3.0/4.0), Markus Lindner, joeBaxterWebb (CC BY 4.0),
Kevin MacLeod (CC BY 4.0); anthems US Navy Band (public domain). None blocked.

**Sizes:** 14 tracks, 32.0 MB at 112 kbps, −18 LUFS (calm −20) — main's encode, not the 96 kbps asked; replacing it
would conflict with the shipped files (backlog: don't overwrite).

**Tests:** `orch/audio.mjs` AUDIO PASS (25 checks). CIGATE on e749ff2 (main merged): 14 PASS
(check, audio, smoke4, mpsync, mpsync-server, art-smoke, art-mpsync, headless, mapsweep, migrate, servertest; 3
no-test SKIPs); FAIL only migrate-abrupt and migrate-down, the known main-side migrate failures — no new failures.
Ready to ship to main.
