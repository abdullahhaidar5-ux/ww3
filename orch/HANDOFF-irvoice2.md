# Handoff: orch/irvoice2 (Iran voices, F5-Persian listening page, 2026-11-10)

Listening page (served from main): https://abdullahhaidar5-ux.github.io/ww3/orch/voices-manly/ir-compare.html
8 IR lines x {Current, Option A, Option B}, same loudness (-15.5 dB active RMS), same `tough_radio` / tools/voices/tough2.py chain.
Nothing in `vo/` or `src/` changed. `orch/vo/render.py` has a new, unused `f5fa` engine (`f5fa_synth`).

* Option A = F5-Persian cloned on XTTS "Damien Black"; Option B = same on "Baldur Sanjin" (English 5.5 s reference clip, made by `orch/voices-manly/ir-mkref.py`).
* 3 takes per line per option, best by P.808 - 2*CER with faster-whisper **large-v3** fa. Picked takes: read-back CER 0.00-0.20 (mean ~0.07).
  Mean P.808 after the radio chain: Current 2.79, A 2.99, B 3.06 (a modest gain in the metric; the real question is the ear).
* Third candidate: found `mehdi-hf/pocket-tts-farsi-v2` (CC-BY-NC, CPU-fast, voice cloning, needs a G2P model + a fork of pocket-tts installed from
  GitHub). NOT tried: the install from an unreviewed git fork was blocked in this routine. If Abdullah wants it, a human-approved run can
  `pip install "pocket-tts @ git+https://github.com/mallahyari/pocket-tts@main"` and follow the model card. `KiaBush/Persian-IPA-to-Speech-F5` (CC-BY-NC) is another one.
  Gated Chatterbox Persian stays out (needs a login).

## Render the full IR sheet with the winner (A = Damien, B = Baldur)
Box: 2 CPU cores, 7 GB RAM, no GPU. Setup (~15 min, 6 GB download):
```
pip install --break-system-packages torch torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install --break-system-packages f5-tts faster-whisper speechmos pyworld coqui-tts
# model: huggingface-cli download Lumos675/F5_TTS_Persian --local-dir w/f5fa   (5.4 GB model_last.pt)
python3 - <<'P'   # convert EMA weights to safetensors, then delete model_last.pt
import torch; from safetensors.torch import save_file
sd=torch.load("w/f5fa/model_last.pt",map_location="cpu",weights_only=True,mmap=True)["ema_model_state_dict"]
save_file({k.replace("ema_model.",""):v.float().contiguous() for k,v in sd.items() if k not in("initted","step")},"w/f5fa/model.safetensors")
P
huggingface-cli download coqui/XTTS-v2 --local-dir w/xm; ln -s $PWD/w/xm /home/claude/xtts/m
python3 orch/voices-manly/ir-mkref.py   # writes refs/Damien.wav, refs/Baldur.wav (run from the dir that has refs/)
```
Then, in `orch/vo/render.py` CAST, change IR to `dict(eng='f5fa', lang='fa', sold=['Damien','Baldur'] (or one name), cmd='Damien')`
with env `F5FA_DIR=w/f5fa F5FA_REFS=w/refs`, and `python3 orch/vo/render.py IR`. render.py's own take picking scores with
faster-whisper *small* (`score.py`); for Persian set `WhisperModel('large-v3')` / `medium` (small CER is ~0.3 even on good lines).
Time: about 90 s per take; the IR sheet is ~40 clips x 3 takes = ~120 renders = **~3 h** on this box (then scoring ~40 min). Run it in the
background in two or three routine slices (render.py caches every take in its cache dir, so it resumes). Then bump the VO cache version in
`src/09-audio.js`, `python3 orch/build.py`, `node orch/smoke.mjs`, `orch/cigate.sh`, ship `vo/IR.mp3` + map + src + index.html together.
Note F5 needs `remove_silence=False`, `torchaudio.load` replaced by a soundfile loader (done in `f5fa_synth`), short lines (<2 words) are risky: keep >=2 words.

## IL (Hebrew) and UA (Ukrainian)
No natural ungated model was checked in this run (time went to IR). Candidates for the next slice: UA = Piper `uk_UA-*-high` is current; try
XTTS-v2 does not cover uk natively (`ru` fallback is wrong). Hebrew = MMS heb/Piper `he_IL` current; F5/Zonos-style Hebrew fine-tunes exist on HF
(search `F5-TTS hebrew`, `Hebrew TTS`) but unverified. Same recipe: char-vocab F5 fine-tune -> safetensors -> `f5fa`-style engine with a deep reference
-> large-v3 scoring -> same radio chain.
