# Overnight queue (Abdullah 2026-11-09 22:36: "work overnight, not live")

Requests Abdullah sends during the day land here; the nightly runner (scheduled task "Nightly queue runner", 00:47 Chicago)
works them top-down while he sleeps and leaves ONE morning report. Rules for the runner are in its own prompt.
Format: `- [ ] (not before YYYY-MM-DD) [lane] request in his words — notes`. Tick `[x]` with the commit when shipped,
`[~]` + a HANDOFF file when stopped early. Never delete lines; move finished ones under "Done".

## Open

- [ ] (not before 2026-11-11) [ai] **Smarter computer opponent** (option 13): AI Hard flanks, uses cover, combines arms (infantry + armour + artillery + air), probes for the weak side, protects its artillery, retreats damaged vehicles to repair — smarter tactics only, NO extra money (standing rule). Prove with the AI-vs-AI tourney: Hard beats Normal ≥65% with equal money; nations stay equal. Sim change → server deploy flow.
- [ ] (not before 2026-11-11) [gfx] **Graphics realism pass** (option 11; his stated next focus): Shia factions first (IR, RS, DW, RV) — uniforms/fatigues, vehicles, Middle Eastern compounds and bunkers, in real gameplay not staged shots; free CC0/CC-BY assets only, credited; must keep smooth-pc / smooth-mp green (instanced, merged per material). Before/after screenshots.
- [ ] (not before 2026-11-11) [audio] **Voices and anthems for the newer nations** (option 12): nations that still borrow another nation's voice sheet (see VO_ALIAS in src/09-audio.js and the "voices/anthems still open" notes in CLAUDE.md) get their own native-language tough radio voices (pipeline: orch/HANDOFF-orch-voices-tough.md) and anthem excerpts (mus/an_pack.py, public-domain/CC recordings, credited). Most-played first: IQ, SY, RV, OB, JO, then the rest. Don't run two TTS/Whisper jobs at once.

## Done
