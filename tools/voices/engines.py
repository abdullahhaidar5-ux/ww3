"""TTS engines + radio processing for the unit-voice sheets (offline tool; not shipped to players).
Engines: Piper (MIT code; per-voice dataset licences, see README), Kokoro-82M (Apache-2.0),
Meta MMS-TTS (CC-BY-NC 4.0, non-commercial: fine for this free game, credited in the menu)."""
import os, subprocess, tempfile, numpy as np
from scipy import signal
import soundfile as sf

W = os.environ.get('VOICE_WORK', '/tmp/claude-0/w')
SR = 22050
_cache = {}

def _piper(model):
    if model not in _cache:
        from piper import PiperVoice
        _cache[model] = PiperVoice.load(f'{W}/piper/{model}.onnx')
    return _cache[model]

def piper(text, model, spk=None, ls=1.0, **_):
    from piper import SynthesisConfig
    v = _piper(model)
    cfg = SynthesisConfig(speaker_id=spk, length_scale=ls, noise_scale=0.6, noise_w_scale=0.7)
    a = np.concatenate([c.audio_float_array for c in v.synthesize(text, syn_config=cfg)])
    return a, v.config.sample_rate

def kokoro(text, v, lang='en-us', sp=1.0, **_):
    import kk
    return kk.synth(text, v, lang, sp)

def mms(text, l, **_):
    import torch
    from transformers import VitsModel, AutoTokenizer
    if ('mms', l) not in _cache:
        _cache[('mms', l)] = (VitsModel.from_pretrained('facebook/mms-tts-' + l).eval(), AutoTokenizer.from_pretrained('facebook/mms-tts-' + l))
    m, tk = _cache[('mms', l)]
    torch.manual_seed(7)
    with torch.no_grad():
        w = m(**tk(text, return_tensors='pt')).waveform[0].numpy()
    return w, m.config.sampling_rate

ENG = {'piper': piper, 'kokoro': kokoro, 'mms': mms}

def ffpitch(a, sr, p=1.0, tempo=1.0):
    """pitch factor p (and tempo) via asetrate/atempo; returns float array at SR"""
    if abs(p - 1) < 1e-3 and abs(tempo - 1) < 1e-3:
        return signal.resample_poly(a, SR, sr) if sr != SR else a
    with tempfile.TemporaryDirectory() as d:
        sf.write(f'{d}/i.wav', a, sr)
        t = tempo / p
        f = f'asetrate={int(sr*p)},aresample={SR},atempo={t:.4f}'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{d}/i.wav', '-af', f, '-ar', str(SR), f'{d}/o.wav'], check=True)
        o, _ = sf.read(f'{d}/o.wav')
    return o

def _trim(a, thr=0.012):
    e = np.abs(a)
    idx = np.where(e > thr * max(e.max(), 1e-6) * 4)[0]
    if len(idx) == 0:
        return a
    return a[max(0, idx[0] - int(.02 * SR)): idx[-1] + int(.05 * SR)]

def radio(a, seed=0, noise=0.012, squelch=True):
    """military radio: band-pass, level + soft limit, faint hiss, key-click and squelch tail"""
    rng = np.random.default_rng(seed)
    a = _trim(a.astype(np.float64))
    sos = signal.butter(4, [230, 3700], 'bandpass', fs=SR, output='sos')
    a = signal.sosfilt(sos, a)
    # gentle compression: bring quiet syllables up
    env = np.sqrt(np.maximum(signal.sosfilt(signal.butter(2, 25, 'low', fs=SR, output='sos'), a ** 2), 0)) + 1e-4
    a = a * (np.mean(env) / env) ** 0.30
    a = a / (np.sqrt(np.mean(a ** 2)) + 1e-9) * 0.13           # ~ -18 dBFS RMS
    a = np.tanh(a * 2.2) / np.tanh(2.2) * 0.9                  # soft limiter / light radio grit
    lead = np.zeros(int(.05 * SR)); tail = np.zeros(int(.16 * SR))
    a = np.concatenate([lead, a, tail])
    hiss = signal.sosfilt(signal.butter(3, [500, 3200], 'bandpass', fs=SR, output='sos'), rng.standard_normal(len(a))) * noise
    a = a + hiss
    if squelch:
        n = int(.05 * SR); t0 = len(a) - len(tail) + int(.01 * SR)
        burst = signal.sosfilt(signal.butter(3, [900, 3000], 'bandpass', fs=SR, output='sos'), rng.standard_normal(n)) * np.hanning(n) * 0.06
        a[t0:t0 + n] += burst
        c = int(.012 * SR); a[:c] += signal.sosfilt(signal.butter(2, [700, 2500], 'bandpass', fs=SR, output='sos'), rng.standard_normal(c)) * np.hanning(c) * 0.05
    pk = np.max(np.abs(a)); a = a / pk * 0.89 if pk > 0.89 else a
    return a.astype(np.float32)

def f0(a, sr, lo=60, hi=300):
    """crude median F0 (autocorrelation) for male/female sanity checks"""
    a = a[:sr * 3]; fr = int(.04 * sr); hop = fr // 2; v = []
    for i in range(0, len(a) - fr, hop):
        x = a[i:i + fr] - a[i:i + fr].mean()
        if np.sqrt(np.mean(x ** 2)) < 0.02: continue
        r = np.correlate(x, x, 'full')[fr - 1:]
        l, h = int(sr / hi), int(sr / lo)
        k = l + np.argmax(r[l:h])
        if r[k] > 0.4 * r[0]: v.append(sr / k)
    return float(np.median(v)) if v else 0.0

def render(text, vs, seed=0):
    """vs: voice dict {e:engine, ..., p:pitch, t:tempo}. returns processed float32 array at SR"""
    a, sr = ENG[vs['e']](text, **{k: x for k, x in vs.items() if k not in ('e', 'p', 't', 'tag')})
    a = ffpitch(np.asarray(a, dtype=np.float64), sr, vs.get('p', 1.0), vs.get('t', 1.0))
    return radio(a, seed)
