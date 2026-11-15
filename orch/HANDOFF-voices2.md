# HANDOFF voices2 (2026-11-15)

Abdullah 04:09 Chicago: "Yes" = re-record the Palestinian (OB) and south-Iraqi (RV) voices with the gritty XTTS pipeline.

## OB (Palestine)
Already landed by voices-lebanese (e1b493e) before this run started: vo/OB*.mp3 cloned from southern-Levantine MASC speakers
(pal_host, pal_talk, pal_story). Lines were kept as they were (Palestinian/Levantine colloquial, no Shia invocations).
Possible polish left: main sheet P['OB'] could use more Palestinian words (هسّا، يلّا يا شباب، إشي، شو هاد) - needs `python3 orch/vo/render.py OB` (~25 min) + ?v= bump.

## RV (south Iraq) - landed
- Lines: main sheet `tools/voices/phrases.py` P['RV'] rewritten in southern Iraqi colloquial (هسّه، شكو، ماكو، أكو، دا، اكدّام، يمعود، يا حجي);
  role/radio/shout lines were already Iraqi and are unchanged. Same keys/shapes.
- Voices: `orch/vo/cast.json` RV: soldiers clone:iq_rap, clone:iq_narr; commander clone:iq_narr. Refs in tools/voices/refs (credits in CREDITS.md).
- Re-rendered vo/RV.mp3, RV_r, RV_h, RV_s + tools/voices/map/RV*.json + patch_map.py; ?v= bumped (main 16, _r/_h/_s 4).
- QC (Whisper small read-back): main 40 clips mean P.808 3.46, CER 0.14; role 54 clips mean CER 0.12 (worst 0.50 "نار عالهدف!");
  radio 13 clips 0.14 (max 0.33); shouts 14 clips 0.23 (max 0.60 on one-word barks).
- Guard `rvvoice:` in orch/decisions.mjs (cast = clone:iq_*, refs exist, credits name "south-Iraqi unit voices ... MASC").

## How the Iraqi speakers were found (MASC has no dialect labels)
1. `transcript/train/train.csv` (137 MB) from huggingface.co/datasets/pain/MASC; score each video by Iraqi words
   (جان/جانت، هيجي، علمود، اهوايه، شكو، ماكو، اكو، هسه، يكدر/يكول، احنه) minus Levantine/Egyptian/Gulf words.
2. The train audio is 8 x 10 GB tar.xz with shuffled order, so each shard holds ~1/8 of every video: stream a whole shard and keep only
   the listed files: `curl -sL .../audio/train/train_07.tar.xz | xz -dc | tar x -T list07.txt` (~12 min per shard, xz-bound).
3. DNSMOS + median pitch per clip, XTTS speaker embeddings to group videos by speaker.
Findings: the Iraqi-dialect speech in MASC train is mostly one Baghdadi narrator (a ~30-video series, all the same voice, clean), Iraqi
rappers/singers (music beds), one female speaker (excluded) and noisy field reports. iq_rap = rapper F0TqulOsxGA, vocals separated with
Demucs htdemucs (`python3 -m demucs --two-stems=vocals`), clone output P.808 ~3.0. A third distinct clean Iraqi male voice was not found.

## Environment notes (fresh sandbox)
torch/torchaudio CPU wheel, coqui-tts, faster-whisper, speechmos, pyworld, librosa, demucs; XTTS-v2 files from huggingface.co/coqui/XTTS-v2 into /home/claude/xtts/m.
torchcodec must be the +cpu wheel (`pip download torchcodec==X --index-url https://download.pytorch.org/whl/cpu`, then install --no-deps), the PyPI one wants CUDA libs.
faster-whisper vs PyAV 16+: remove `metadata_errors="ignore"` from faster_whisper/audio.py (av.open no longer takes it).

## Not done
- FR, DE, GB unit sheets with XTTS clones of native CC0/CC-BY/public-domain speakers (step 3) - not started.
- A third Iraqi voice (scan the remaining shards 01/02/04/06/08 for more Iraqi videos, e.g. the zSzAKI4X5YM rapper + Demucs).
