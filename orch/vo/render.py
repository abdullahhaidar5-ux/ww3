#!/usr/bin/env python3
"""Render the unit voice clip sheets vo/<CODE>.mp3 and their clip offsets (VO_MAP in src/09-audio.js).

Engines (chosen per language by naturalness/intelligibility scoring, see orch/reports/voices-natural.md):
  * XTTS-v2 (Coqui, CPML non-commercial) built-in studio speakers: en ar tr ru zh-cn ko hi es fr de
  * Piper (Rhasspy/NabuCasa voices): uk (mykyta/oleksa high), fa (ganji/gyro), he (saspeech)
  * Meta MMS-TTS (CC BY-NC 4.0): he (heb)
Each line is rendered in several takes; the take with the best DNSMOS P.808 score and Whisper read-back wins.
Then a light radio treatment (300-3400 Hz band, compression, faint hiss/squelch on some lines), trimmed silences,
matched loudness, and one ~40 kbps mono mp3 per nation.

usage: python3 orch/vo/render.py RS DW IR ...   (needs: coqui-tts, piper-tts, transformers, faster-whisper,
       speechmos, librosa, scipy, ffmpeg; XTTS weights in /home/claude/xtts/m, Piper voices in /home/claude/piperv)
"""
import sys, os, json, re, subprocess, hashlib, random
import numpy as np, librosa, soundfile as sf
from scipy.signal import butter, sosfilt
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from score import score
CACHE = os.environ.get('VO_CACHE', '/home/claude/vowork/cache')
PIPER = os.environ.get('PIPER_DIR', '/home/claude/piperv')
SR = 24000
os.makedirs(CACHE, exist_ok=True)

# voice cast per nation: engine:language, soldier voices (rotated over the lines), commander (unit ready / base alarm)
# XTTS speakers picked per language by orch/vo/pick.py (deep, clear, natural-scoring male studio voices)
X = 'xtts'
CAST = {
    'RS': dict(eng=X, lang='ar', sold=['Zacharie Aimilios', 'Ilkin Urbano', 'Filip Traverse'], cmd='Damien Black'),
    'DW': dict(eng=X, lang='ar', sold=['Gilberto Mathias', 'Aaron Dreschner', 'Luis Moray'], cmd='Wulf Carlevaro'),
    'SA': dict(eng=X, lang='ar', sold=['Kazuhiko Atallah', 'Marcos Rudaski'], cmd='Torcull Diarmuid'),
    'AE': dict(eng=X, lang='ar', sold=['Ferran Simen', 'Damjan Chapman'], cmd='Ludvig Milivoj'),
    'EG': dict(eng=X, lang='ar', sold=['Xavier Hayasaka', 'Filip Traverse'], cmd='Damien Black'),
    'IR': dict(eng='piper', lang='fa', sold=['fa_IR-ganji-medium', 'fa_IR-gyro-medium'], cmd='fa_IR-ganji-medium'),
    'IL': dict(eng='mix', lang='he', sold=['mms:heb', 'piper:he_IL-saspeech-medium'], cmd='mms:heb'),
    'UA': dict(eng='piper', lang='uk', sold=['uk_UA-mykyta-high', 'uk_UA-oleksa-high'], cmd='uk_UA-oleksa-high'),
}
CAST_FILE = os.path.join(HERE, 'cast.json')   # XTTS casts for the other nations (written after speaker picking)
if os.path.exists(CAST_FILE):
    for k, v in json.load(open(CAST_FILE)).items():
        CAST.setdefault(k, v)

# Lines whose native script XTTS can't read are given in a script it can (Urdu -> Hindustani in Devanagari).
TRANSLIT = json.load(open(os.path.join(HERE, 'translit.json'), encoding='utf-8')) if os.path.exists(os.path.join(HERE, 'translit.json')) else {}


def key(*a):
    return hashlib.sha1(json.dumps(a, ensure_ascii=False).encode()).hexdigest()[:16]


_piper = {}
_mms = {}


def synth(eng, voice, lang, text, take, mood):
    """one take -> float32 mono at SR. mood: 'sold' (energetic), 'cry' (shouted), 'cmd' (calm)."""
    if eng == 'mix':
        eng, voice = voice.split(':', 1)
    f = os.path.join(CACHE, key(eng, voice, lang, text, take, mood) + '.wav')
    if os.path.exists(f):
        w, _ = sf.read(f, dtype='float32')
        return w
    if eng == 'xtts':
        from xt import synth as xs
        temp = {'sold': 0.78, 'cry': 0.85, 'cmd': 0.65}[mood]
        speed = {'sold': 1.1, 'cry': 1.05, 'cmd': 1.0}[mood]
        w, sr = xs(text, lang, voice, temp=temp, speed=speed, seed=take * 7919 + 13)
    elif eng == 'piper':
        from piper import PiperVoice, SynthesisConfig
        if voice not in _piper:
            _piper[voice] = PiperVoice.load(os.path.join(PIPER, voice + '.onnx'))
        v = _piper[voice]
        ls = {'sold': 0.88, 'cry': 0.92, 'cmd': 1.0}[mood]
        ns = [0.667, 0.55, 0.8][take % 3]
        cfg = SynthesisConfig(length_scale=ls, noise_scale=ns, noise_w_scale=0.8)
        w = np.concatenate([c.audio_float_array for c in v.synthesize(text, syn_config=cfg)])
        sr = v.config.sample_rate
    elif eng == 'mms':
        import torch
        from transformers import VitsModel, AutoTokenizer
        if voice not in _mms:
            _mms[voice] = (VitsModel.from_pretrained('facebook/mms-tts-' + voice), AutoTokenizer.from_pretrained('facebook/mms-tts-' + voice))
        m, t = _mms[voice]
        m.speaking_rate = {'sold': 1.12, 'cry': 1.05, 'cmd': 1.0}[mood]
        m.noise_scale = [0.667, 0.55, 0.8][take % 3]
        torch.manual_seed(take * 31 + 7)
        with torch.no_grad():
            w = m(**t(text, return_tensors='pt')).waveform[0].numpy()
        sr = m.config.sampling_rate
    w = np.asarray(w, dtype=np.float32)
    if sr != SR:
        w = librosa.resample(w, orig_sr=sr, target_sr=SR)
    sf.write(f, w, SR)
    return w


def trim(w):
    _, (a, b) = librosa.effects.trim(w, top_db=32, frame_length=512, hop_length=128)
    a = max(0, a - int(.03 * SR)); b = min(len(w), b + int(.06 * SR))
    return w[a:b]


def best_take(eng, voice, lang, text, mood, n):
    wl = {'zh-cn': 'zh'}.get(lang, lang)
    best = None
    for take in range(n):
        w = trim(synth(eng, voice, lang, text, take, mood))
        d = len(w) / SR
        r = score(w, SR, wl, text)
        # long takes for a short line mean babble/hallucination
        exp = 0.35 + 0.075 * len(re.sub(r'\s', '', text))
        s = r['p808'] - 2.0 * r['cer'] - (1.0 if d > 1.7 * exp + 0.45 else 0) - 0.15 * max(0, d - exp) - (1.0 if d < 0.25 else 0)
        if best is None or s > best[0]:
            best = (s, w, r, take)
    return best


def radio(w, rng, hiss):
    hp = butter(2, 300, 'highpass', fs=SR, output='sos')
    lp = butter(4, 3400, 'lowpass', fs=SR, output='sos')
    full = w.copy()
    w = sosfilt(lp, sosfilt(hp, w))
    w = 0.85 * w + 0.15 * sosfilt(butter(2, 150, 'highpass', fs=SR, output='sos'), full)   # light, not walkie-talkie
    # compressor: ratio 3 above -20 dB, 5 ms attack / 80 ms release
    env = np.zeros_like(w); e = 0.0
    aa, ar = np.exp(-1 / (.005 * SR)), np.exp(-1 / (.08 * SR))
    x = np.abs(w)
    for i in range(len(w)):
        c = aa if x[i] > e else ar
        e = c * e + (1 - c) * x[i]; env[i] = e
    lvl = 20 * np.log10(env / (np.max(env) + 1e-9) + 1e-9)
    gain = np.where(lvl > -20, (-20 + (lvl + 20) / 3) - lvl, 0)
    w = w * 10 ** (gain / 20)
    w = np.tanh(1.6 * w / (np.max(np.abs(w)) + 1e-9)) / np.tanh(1.6)    # slight drive
    # loudness: active RMS -16 dBFS, peaks <= -1 dBFS
    act = w[np.abs(w) > 0.02 * np.max(np.abs(w))]
    rms = np.sqrt(np.mean(act ** 2)) if len(act) else 1
    w = w * (10 ** (-16 / 20) / rms)
    pk = np.max(np.abs(w)); lim = 10 ** (-1 / 20)
    if pk > lim:
        w = np.where(np.abs(w) > lim * .8, np.sign(w) * (lim * .8 + (lim * .2) * np.tanh((np.abs(w) - lim * .8) / (lim * .2))), w)
    if hiss:   # faint band-limited hiss under the line and a short squelch tail
        nb = sosfilt(butter(2, [500, 3000], 'bandpass', fs=SR, output='sos'), rng.standard_normal(len(w) + int(.09 * SR)))
        nb = nb / (np.max(np.abs(nb)) + 1e-9)
        out = np.concatenate([w, np.zeros(int(.09 * SR))])
        out[:len(w)] += nb[:len(w)] * 10 ** (-46 / 20)
        tail = nb[len(w):] * 10 ** (-24 / 20) * np.exp(-np.linspace(0, 6, int(.09 * SR)))
        out[len(w):] += tail
        w = out
    f = int(.005 * SR)
    w[:f] *= np.linspace(0, 1, f); w[-f:] *= np.linspace(1, 0, f)
    return w.astype(np.float32)


def nation(fac, phr, n_takes=3, log=print):
    C = CAST[fac]
    groups = {}   # name -> list per kind of list of texts   (e.g. 'l' from PHR_FAC, 'c' from FCRY)
    for name, src in phr.items():
        lst = src.get(fac)
        if lst is None:
            continue
        groups[name] = [list(x or []) for x in lst]
    rng = np.random.default_rng(sum(map(ord, fac)))
    sheet = []; t = 0.0; gap = int(.12 * SR); vmap = {}; nsold = 0; rep = []
    for name, kinds in groups.items():
        out = []
        for k, texts in enumerate(kinds):
            ent = []
            for i, item in enumerate(texts):
                lang, text = (item if isinstance(item, (list, tuple)) else (C['lang'], item))
                say = TRANSLIT.get(text, text)
                cry = name == 'c'
                if cry or k in (2, 5):
                    mood = 'cry'
                elif k in (3, 7):
                    mood = 'cmd'
                else:
                    mood = 'sold'
                voices = C['sold'][lang] if isinstance(C['sold'], dict) else C['sold']
                if k in (3, 4, 7) and not cry:
                    v = C['cmd'][lang] if isinstance(C['cmd'], dict) else C['cmd']
                else:
                    v = voices[(i + (k if cry else 0)) % len(voices)]
                s, w, r, take = best_take(C['eng'], v, lang, say, mood, n_takes)
                w = radio(w, rng, hiss=(rng.random() < .35))
                ent.append([round(t, 3), round(len(w) / SR, 3)])
                sheet += [w, np.zeros(gap, np.float32)]
                t += (len(w) + gap) / SR
                rep.append((round(r['p808'], 2), round(r['cer'], 2)))
                log(f'{fac} {name}{k} {v[:14]:14} p808 {r["p808"]:.2f} cer {r["cer"]:.2f} {len(w)/SR:.2f}s take{take} | {text} -> {r["hyp"].strip()}')
            out.append(ent)
        while name == 'c' and len(out) < 8:
            out.append([])
        vmap[name] = out
    wav = np.concatenate(sheet)
    tmp = os.path.join(CACHE, fac + '.sheet.wav')
    sf.write(tmp, wav, SR)
    dst = os.path.join(ROOT, 'vo', fac + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '40k', dst], check=True)
    log(f'{fac}: {len(rep)} clips, {t:.1f}s, {os.path.getsize(dst)//1024} KB, mean p808 {np.mean([a for a,_ in rep]):.2f} cer {np.mean([b for _,b in rep]):.2f}')
    json.dump(vmap, open(os.path.join(ROOT, 'tools', 'voices', 'map', fac + '.json'), 'w'), separators=(',', ':'))
    return vmap


def phrases():
    """{'l': P, 'c': C} from tools/voices/phrases.py (kinds: select, move, attack, unit ready, base attacked, under fire,
    unit lost, building ready; C = war cries for kinds 0-3). An entry is a text or (lang, text)."""
    sys.path.insert(0, os.path.join(ROOT, 'tools', 'voices'))
    import importlib, phrases as ph
    importlib.reload(ph)
    return {'l': ph.P, 'c': ph.C}


def write_map(updates):
    js = os.path.join(ROOT, 'src', '09-audio.js')
    s = open(js, encoding='utf-8').read()
    m = re.search(r'const VO_MAP=(\{.*?\});const VOB', s)
    cur = json.loads(m.group(1))
    for k, v in updates.items():
        cur[k] = v
    s = s[:m.start(1)] + json.dumps(cur, separators=(',', ':')) + s[m.end(1):]
    open(js, 'w', encoding='utf-8').write(s)


if __name__ == '__main__':
    P = phrases()
    n = int(os.environ.get('VO_TAKES', '3'))
    for fac in sys.argv[1:]:
        write_map({fac: nation(fac, P, n_takes=n)})
