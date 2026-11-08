# Handoff: orch/irvoice (Iran Persian voices, 2026-11-08) — STOPPED EARLY, nothing shipped to main

Goal: replace Piper fa (ganji/gyro) IR voices with something more natural. Findings (2-core / 7 GB cloud box, no GPU):

* **Chatterbox Persian** (Thomcles/Chatterbox-TTS-Persian-Farsi, best candidate by reputation): HF repo is GATED (needs a logged-in
  HF token + accepted terms) -> not downloadable in the routine. The ungated mirror `mazrba/Chatterbox-TTS-Persian-gguf` (MIT) is a
  GGUF for crispasr/llama.cpp-style runtimes (untested, needs a Windows/Vulkan or CPU gguf runner).
* **alikhabazian/XTTS_Persian** (MIT, XTTS-v2 GPT fine-tune): checkpoint is a training ckpt with an EXTENDED text vocab (10120 rows vs 6681);
  the extended `vocab.json` is not in the repo. Truncating to the base 6681 rows loads, but output is garbled (CER 0.7-1.0). Unusable.
* **Lumos675/F5_TTS_Persian** (Apache-2.0, F5TTS_v1_Base char vocab, ships vocab.txt): works. Convert `model_last.pt` ema weights to
  safetensors (torch.load weights_only=True, key `ema_model_state_dict`), `F5TTS(model="F5TTS_v1_Base", ckpt_file=..., vocab_file=vocab.txt)`,
  reference = an XTTS deep-speaker clip (Arabic or English ref worked; Persian ref text not required to match language). torchaudio.load
  needs a soundfile monkeypatch (torchcodec lib mismatch). Speed ~50-70 s per line on CPU (nfe 24) -> a full IR sheet (40 clips x 2-3 takes) = 1.5-2 h.
  Raw (pre-radio) test lines, 12 samples: p808 2.9-3.7 (mean ~3.2), CER 0.30-0.53 with whisper-small.

Baseline (current vo/IR.mp3, 40 clips, after radio chain): p808 **2.79**, whisper-small fa CER **0.32** (so the 0.12 gate is not
measurable for Persian with whisper-small; it needs whisper large/medium to be meaningful). F5 CER on the same lines was not clearly better,
and p808 was measured pre-radio (not comparable). Not shipped: no clear, verified win, and main is what friends play.

Next steps if resumed: (1) get an HF token for the gated Chatterbox Persian and test it (best expected naturalness); or (2) run F5 Persian
on a GPU box and score with whisper-medium/large-v3 fa; then render with `orch/vo/render.py` adding an `f5fa` engine (synth() in render.py,
reference clips from the deep XTTS pool), pass through `tough_radio`, bump VO cache version in src/09-audio.js, gates, ship.
