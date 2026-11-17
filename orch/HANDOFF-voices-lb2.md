# HANDOFF voices-lb2 (2026-11-17) - Lebanese (RS) re-record, NOT on main

Abdullah, Tue 2026-11-17 06:10 Chicago: "The Lebanese voices are really bad now" (robotic/garbled, wrong accent or words).
ORCH 2 rolled RS back to the 2026-11-14 recordings on main (ab83d2d). This branch holds a new re-record that goes live
**only after Abdullah listens and says yes**.

**Listen (phone):** https://github.com/abdullahhaidar5-ux/ww3/raw/orch/voices-lb2/orch/out-lb2/sample.mp3
(~32 s: 8 lines with Saturday's voices = what the game plays now, one beep, then the same 8 kinds of line with the new voices:
select, move, attack x2, unit ready, base attacked, under fire, "Labbayk ya Hussein".)

## 1. Why Sunday's record (90ec5bf) sounded bad
Whisper medium read-back of Sunday's four RS sheets, 148 clips, Arabic-normalised character error rate (orch/vo/lbeval.py):

| sheet | clips | mean CER | median | clips > 15 % |
|---|---|---|---|---|
| RS (main) | 40 | 0.167 | 0.10 | 17 |
| RS_r (roles) | 81 | 0.207 | 0.14 | 39 |
| RS_h (radio) | 13 | 0.074 | 0.06 | 2 |
| RS_s (shouts) | 14 | 0.567 | 0.50 | 13 |
| **all** | 148 | **0.219** | 0.14 | **71** |

(Whisper large-v3 got through the first 73 clips before the sandbox ran out of memory: mean 0.123, 21 of 73 above 15 %.
large-v3 needs ~5 GB RSS on its own here, so the before/after numbers are both Whisper medium.)
Typical misreads: "ليك الدبّابة، ضربها" -> "اني انا بابا ضربها", "منحمل الصواريخ ومنمشي" -> "انا احمل الصواريخ ومن المشترك",
"قنبلة" -> "بمولا", "انبطحوا، قنبلة" -> nothing, "هيهات منّا الذلّة" -> "أيها التمنى ذلة".

Causes found:
- **Synthesis settings (main cause).** tough2 runs XTTS hot and fast: temperature 0.82-0.9, speed 1.2-1.22. On Arabic this smears
  consonants and drops syllables. The same reference clips at temperature 0.55 / speed 1.03 read back almost perfectly
  (test lines: lb_narr 0-0.14 CER, lb_tech 0-0.25 vs 0.3-0.9 in Sunday's sheets).
- **Robotic sound:** every line was pitched down up to 3 semitones with the WORLD vocoder (tough2 F0 target ~90 Hz). That
  resynthesis is what sounds robotic on cloned voices; plus two-stage hard compression and tanh drive (mix 0.5-0.55) on top.
- **Reference clips:** lb_vlog and lb_tech came from MASC "noisy" videos (noise floor -35 / -33 dB, SNR ~14 and ~18 dB) - XTTS
  copies the noise and room into the voice. lb_narr is clean but is the narrator of a Lebanese *Bible-story* series (calm
  storytelling, not a fighter). All three are male and Lebanese (transcripts use هيدا، انو، -هن).
- **Lines:** some were slang pile-ups that XTTS (trained on MSA) cannot say, e.g. "شايفينهن، ضربوهن", "إيه معك، شو في؟",
  "دخلك، عم يهجموا عالقاعدة". One-word shouts barked at speed 1.2 were mostly unintelligible (shout sheet 0.57 CER).
- Take picking weighted "toughness" (lower pitch, more effort) x1.2 against clarity, and accepted takes up to 0.34 CER.

## 2. Lines (tools/voices/phrases.py P/C['RS'], roles_lines.py R['RS'], radio_lines.py _b('RS'), shout_lines.py _s('RS'))
Rewritten short and natural, the way a south-Lebanese fighter talks on the radio: حاضر يا حجّ، أمُرني، يلّا يا شباب، ماشيين هلّق،
يلّا عليهن، عم ننضرب، النار كتير علينا، بدّنا دعم هلّق، القاعدة عم تنضرب، راحت الضيعة، صاروخ! تخبّوا، دعوس يا شوفير،
رمّانة (grenade), عم غيّر المخزن. No MSA (no "تحت النار، بدنا دعم" style), no Iraqi/Palestinian words.
Shia motifs kept: يا حسين، لبّيك يا حسين، يا علي (مدد)، يا زهرا، يا أبو الفضل (said the colloquial way), يا صاحب الزمان،
يا حيدر، هيهات منّا الذلّة. Fictional force only: the hero line no longer names a real unit ("شباب الرضوان" -> "القوّة الخاصّة").
Same keys and shapes everywhere (8 kinds / 9 roles x 3 / 13 radio keys / 7 shout keys x 2).

## 3. Voices
New reference clips in tools/voices/refs (credits added to refs/CREDITS.md; menu credit sentence updated in the index.html shell,
guard `rsvoice:` still matches): all MASC (Al-Fetyani et al. 2021, IEEE DataPort doi:10.21227/e1qb-jv46, **CC BY 4.0**).
- `lb_story` (30.6 s): the Lebanese narrator, 6 of his cleanest clips from 5 videos of the series (DNSMOS BAK >= 3.2, P.808 >= 3.4),
  ~111 Hz - commander + soldier 1.
- `lb_techc` (18.9 s): lb_tech (Lebanese presenter, ~118 Hz) with its background noise removed (noisereduce, noise floor -33 -> -47 dB) - soldier 2.
- `lb_talk` (22.6 s): MASC MKzgPzpsivM, male Levantine presenter, ~126 Hz, P.808 3.5 - soldier 3.
Searched: MASC test split + train shards 03 and 05 for Lebanese-marker videos (هيدا/هيدي، هلّق، -كن/-هن، انو، رح); the
clean ("c") Lebanese speech in MASC is almost all ONE narrator (XTTS speaker similarity 0.75-0.92 across 15 videos), one
clean Lebanese speaker was female (RlMtzKuQY0E, rejected by an XTTS male/female embedding check), the rest are noisy vlogs.
A clearly-Lebanese third clean male voice was not found; lb_talk is Levantine (MSA content, Levantine voice).

Settings (orch/vo/lb2.py, separate from tough2 so no other nation changes): XTTS temperature 0.5-0.65 per take, speed
1.0-1.06, repetition penalty 7, top_p 0.8, top_k 30, conditioning 24 s in 6 s chunks; 3 seeds per line, +4 while the best
take reads back above 15 % (up to 15). No pitch-down. Light radio: 170-5200 Hz (combat 220-4600), +2.5 dB presence, one 3:1
compressor, drive mix 0.2-0.3, static at -58 dB, quiet squelch tail, gunfire bed 24 dB under the "under fire" lines.
Every processed clip is read back again; if the radio chain blurs it, a milder chain or the next take is used.

## 4. After
Same check (Whisper medium, greedy, clips cut from the final mp3 sheets exactly as the game plays them):

| sheet | clips | Sunday mean CER | **new mean CER** | Sunday > 15 % | **new > 15 %** |
|---|---|---|---|---|---|
| RS (main) | 40 | 0.167 | **0.021** | 17 | **2** |
| RS_r (roles) | 81 | 0.207 | **0.074** | 39 | **12** |
| RS_h (radio) | 13 | 0.074 | **0.052** | 2 | **2** |
| RS_s (shouts) | 14 | 0.567 | **0.204** | 13 | **6** |
| **all** | 148 | **0.219** | **0.070** | **71** | **22** |

Greedy Whisper is jumpy on 1-2 s clips (it dropped repeated words, once translated a line into MSA). Those 22 clips were read
again with beam 5 + a short Lebanese text prompt; taking the better of the two reads: mean CER **0.042**, **9 of 148** above 15 %:
- spelling/dialect, not garbling: "آر بي جي" written in Latin letters (R.B.J.), "قدّامنا" heard as "أدامنا" (Lebanese ق = hamza,
  that is the accent working), "على آخر سرعة" -> "على آخر السرعة";
- slightly unclear (0.17-0.31): "عم يهجموا عالقاعدة" (-> عالقائدة), "القنّاص جاهز", "هيهات منّا الذلّة" in the elite role
  (the main-sheet war cry reads 0.0), "فريق الصواريخ حاضر", "لقدّام يا شوفير", "الزورق جاهز".
Every one of these passed the per-clip check while rendering (raw take <= 15 % and again after the radio chain, the last 22
also through the mp3 codec), so the rest is Whisper noise on very short clips - Abdullah's ears decide.
Naturalness: DNSMOS P.808 of the picked takes 3.35-3.63 (Sunday's sheet 3.51 before the grit chain). Sheets are 48 kbps now
(36-40 kbps blurred consonants): RS 473 KB, RS_r 1070 KB, RS_h 176 KB, RS_s 169 KB (+0.5 MB in total, loaded on demand).
Per-line numbers: /home/claude/vowork/lb2/report.json (sandbox only) and `python3 orch/vo/lbeval.py DIR medium`.

## Files on this branch (orch/voices-lb2, NOT merged)
vo/RS.mp3, RS_r, RS_h, RS_s + tools/voices/map/RS*.json, src/09-audio.js / 09b-radio.js / 09c-shouts.js (patch_map.py; ?v= main 18,
_r/_h/_s 6), index.html (build.py; --check passes), refs + CREDITS, orch/vo/lb2.py (renderer), orch/vo/lbeval.py (read-back),
orch/vo/lb2sample.py + orch/out-lb2/sample.mp3, orch/vo/render.py CAST['RS'] (= the new cast, for the decisions guard).
`node orch/decisions.mjs` timed out here (600 s, the sandbox is too slow for its browser part) - run `orch/cigate.sh` on GitHub before landing.

## To land after Abdullah says yes
Rebase on origin/main, re-run `python3 tools/voices/patch_map.py` (other nations' maps may have moved) and bump ?v= again if
main bumped meanwhile, `python3 orch/build.py` (index.html conflicts -> rebuild), smoke + decisions, cigate, then add a
DECISIONS.md line ("Lebanese voices re-recorded, approved <date>") and a HISTORY line. If he says no: delete nothing, note why.

## How to re-render
pip: torch/torchaudio CPU, coqui-tts, torchcodec (+cpu wheel, --no-deps), faster-whisper (remove `metadata_errors="ignore"` in
faster_whisper/audio.py for PyAV 16+), speechmos, librosa, noisereduce; XTTS-v2 files in /home/claude/xtts/m.
XTTS (~3-4 GB) and Whisper medium (~3 GB RSS) do not fit together in this sandbox's 6.2 GB memory cgroup, hence the phases:
`python3 orch/vo/lb2.py gen` -> `score` (repeat while it reports failures) -> `build`; `python3 orch/vo/lbeval.py DIR medium` for the sheet check.
