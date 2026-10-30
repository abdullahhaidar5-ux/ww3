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
from score import score, tough
CACHE = os.environ.get('VO_CACHE', '/home/claude/vowork/cache')
PIPER = os.environ.get('PIPER_DIR', '/home/claude/piperv')
SR = 24000
os.makedirs(CACHE, exist_ok=True)

# voice cast per nation: engine:language, soldier voices (rotated over the lines), commander (unit ready / base alarm)
# XTTS speakers picked per language by orch/vo/audition.py (2026-10-29 tough pass: deepest, hardest-sounding male studio
# voices that stay natural and intelligible in shouted delivery; score p808 + 0.8*tough - 2*cer)
X = 'xtts'
CAST = {
    'RS': dict(eng=X, lang='ar', sold=['Gilberto Mathias', 'Eugenio Mataracı', 'Damjan Chapman'], cmd='Torcull Diarmuid'),
    'DW': dict(eng=X, lang='ar', sold=['Aaron Dreschner', 'Ferran Simen', 'Dionisio Schuyler'], cmd='Kazuhiko Atallah'),
    'SA': dict(eng=X, lang='ar', sold=['Kazuhiko Atallah', 'Torcull Diarmuid'], cmd='Viktor Menelaos'),
    'AE': dict(eng=X, lang='ar', sold=['Ferran Simen', 'Damjan Chapman'], cmd='Dionisio Schuyler'),
    'EG': dict(eng=X, lang='ar', sold=['Eugenio Mataracı', 'Aaron Dreschner'], cmd='Gilberto Mathias'),
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
    """one take -> float32 mono at SR. mood: 'sold' (terse, clipped), 'cry' (shouted over gunfire), 'grim' (unit lost),
    'cmd' (calm but hard). Tough delivery (2026-10-29): faster, hotter sampling on combat lines."""
    if eng == 'mix':
        eng, voice = voice.split(':', 1)
    f = os.path.join(CACHE, key('tough1', eng, voice, lang, text, take, mood) + '.wav')
    if os.path.exists(f):
        w, _ = sf.read(f, dtype='float32')
        return w
    if eng == 'xtts':
        from xt import synth as xs
        temp = {'sold': 0.8, 'cry': 0.9, 'grim': 0.72, 'cmd': 0.68}[mood] if take < 3 else 0.6 + 0.08 * (take % 3)
        speed = {'sold': 1.16, 'cry': 1.12, 'grim': 1.0, 'cmd': 1.06}[mood]
        w, sr = xs(text, lang, voice, temp=temp, speed=speed, seed=take * 7919 + 13)
    elif eng == 'piper':
        from piper import PiperVoice, SynthesisConfig
        if voice not in _piper:
            _piper[voice] = PiperVoice.load(os.path.join(PIPER, voice + '.onnx'))
        v = _piper[voice]
        ls = {'sold': 0.84, 'cry': 0.86, 'grim': 0.97, 'cmd': 0.94}[mood]
        ns = [0.7, 0.8, 0.6][take % 3] if mood == 'cry' else [0.667, 0.55, 0.8][take % 3]
        cfg = SynthesisConfig(length_scale=ls, noise_scale=ns, noise_w_scale=0.8)
        w = np.concatenate([c.audio_float_array for c in v.synthesize(text, syn_config=cfg)])
        sr = v.config.sample_rate
    elif eng == 'mms':
        import torch
        from transformers import VitsModel, AutoTokenizer
        if voice not in _mms:
            _mms[voice] = (VitsModel.from_pretrained('facebook/mms-tts-' + voice), AutoTokenizer.from_pretrained('facebook/mms-tts-' + voice))
        m, t = _mms[voice]
        m.speaking_rate = {'sold': 1.16, 'cry': 1.12, 'grim': 1.0, 'cmd': 1.05}[mood]
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


def best_take(eng, voice, lang, text, mood, n, most=8):
    """n takes; if none reads back right (Whisper) at a sane length (XTTS can babble on short lines), keep sampling
    up to `most` takes. Best = DNSMOS P.808 naturalness minus read-back errors minus over-length, plus a toughness
    proxy (lower median pitch, more vocal effort; score.tough) so the hardest-sounding clean take wins."""
    wl = {'zh-cn': 'zh'}.get(lang, lang)
    exp = 0.35 + 0.075 * len(re.sub(r'\s', '', text)) * (2.2 if lang in ('zh-cn', 'ko') else 1)
    best = None; take = 0
    while take < n or (take < most and not best[4]):
        w = trim(synth(eng, voice, lang, text, take, mood))
        d = len(w) / SR
        r = score(w, SR, wl, text)
        long = d > 1.7 * exp + 0.45
        r['tough'] = tough(w, SR)['tough']
        s = r['p808'] + 0.8 * r['tough'] - 2.0 * r['cer'] - (3.0 if long else 0) - 0.15 * max(0, d - exp) - (1.0 if d < 0.25 else 0)
        ok = r['cer'] <= 0.34 and not long
        if best is None or (ok, s) > (best[4], best[0]):
            best = (s, w, r, take, ok)
        take += 1
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


_GUN = None


def gunfire():
    """distant rifle / MG bursts from sfx/sfx.mp3 (CC0/CC-BY, credited in the menu) for the under-fire bed"""
    global _GUN
    if _GUN is None:
        man = json.load(open(os.path.join(ROOT, 'sfx', 'manifest.json')))
        w, _ = librosa.load(os.path.join(ROOT, 'sfx', 'sfx.mp3'), sr=SR)
        _GUN = [w[int(a * SR):int((a + d) * SR)] for n in ('rifle', 'mg') for a, d in man['clips'][n]]
    return _GUN


def p808(w):
    from speechmos import dnsmos
    x = np.clip(librosa.resample(np.asarray(w, dtype=np.float32), orig_sr=SR, target_sr=16000), -1, 1)
    return float(dnsmos.run(np.pad(x, (0, max(0, 16000 - len(x)))), 16000)['p808_mos'])


def pitch_down(w, semis):
    """formant-preserving pitch shift (ffmpeg rubberband, formant=preserved), same length"""
    if not semis:
        return w
    i = os.path.join(CACHE, 'pd_in.wav'); o = os.path.join(CACHE, 'pd_out.wav')
    sf.write(i, w, SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', i, '-af',
                    f'rubberband=pitch={2 ** (-semis / 12):.5f}:formant=preserved:pitchq=quality:transients=smooth', o], check=True)
    x, _ = sf.read(o, dtype='float32')
    return x[:len(w)] if len(x) >= len(w) else np.pad(x, (0, len(w) - len(x)))


def comp(w, thr, ratio, att, rel):
    env = np.zeros_like(w); e = 0.0
    aa, ar = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    x = np.abs(w)
    for i in range(len(w)):
        c = aa if x[i] > e else ar
        e = c * e + (1 - c) * x[i]; env[i] = e
    lvl = 20 * np.log10(env / (np.max(env) + 1e-9) + 1e-9)
    return w * 10 ** (np.where(lvl > thr, (thr + (lvl - thr) / ratio) - lvl, 0) / 20)


def peak(w, f0, gain_db, q=1.0):
    """RBJ peaking EQ"""
    from scipy.signal import lfilter
    A = 10 ** (gain_db / 40); om = 2 * np.pi * f0 / SR; al = np.sin(om) / (2 * q)
    b = [1 + al * A, -2 * np.cos(om), 1 - al * A]; a = [1 + al / A, -2 * np.cos(om), 1 - al / A]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], w)


def tough_radio(w, rng, k, semis=None):
    """tough field-radio chain (2026-10-29): optional gentle formant-preserving pitch-down (only when the voice is not
    already deep, <= 2 semitones), low-mid warmth, tighter 330-3300 Hz band, hard compression, light grit, then static,
    a squelch click on some lines and a very quiet distant-gunfire bed under 'under fire' (k=5) lines."""
    if semis is None:   # auto: shift only voices above ~110 Hz median, at most 2 semitones
        f = tough(w, SR)['f0']
        semis = float(np.clip(12 * np.log2(max(f, 1) / 110), 0, 2))
    if semis >= 0.3:    # ...and only if it stays natural (DNSMOS P.808 drops by < 0.12)
        x = pitch_down(w, semis)
        if p808(x) > p808(w) - 0.12:
            w = x
    full = sosfilt(butter(2, 140, 'highpass', fs=SR, output='sos'), w)
    band = sosfilt(butter(4, 3300, 'lowpass', fs=SR, output='sos'), sosfilt(butter(3, 330, 'highpass', fs=SR, output='sos'), w))
    w = 0.82 * band + 0.18 * full
    w = peak(w, 380, 3.5, 0.8)            # low-mid warmth / chest
    w = peak(w, 1800, 2.5, 1.2)           # bite
    w = comp(w, -26, 5, .003, .06)        # hard compression
    w = w / (np.max(np.abs(w)) + 1e-9)
    g = np.tanh(1.9 * w + 0.08 * w * w) / np.tanh(1.9)    # light grit: drive + a touch of even harmonics
    w = 0.5 * g + 0.5 * w
    w = w - np.mean(w)
    act = w[np.abs(w) > 0.02 * np.max(np.abs(w))]
    rms = np.sqrt(np.mean(act ** 2)) if len(act) else 1
    w = w * (10 ** (-16 / 20) / rms)      # loudness: active RMS -16 dBFS (as before)
    nb = lambda n: sosfilt(butter(2, [450, 3200], 'bandpass', fs=SR, output='sos'), rng.standard_normal(n))
    pre = int(.07 * SR) if rng.random() < .35 else 0     # squelch click + burst before the line on some lines
    post = int(.09 * SR)
    out = np.zeros(pre + len(w) + post, np.float32)
    out[pre:pre + len(w)] = w
    if pre:
        n = nb(pre); n /= np.max(np.abs(n)) + 1e-9
        out[:pre] += n * 10 ** (-22 / 20) * np.exp(-np.linspace(0, 5, pre))
        out[0:int(.003 * SR)] += 10 ** (-12 / 20) * np.hanning(int(.003 * SR))   # the click
    n = nb(len(out)); n /= np.max(np.abs(n)) + 1e-9
    out += n * 10 ** ((-46 if rng.random() < .5 else -56) / 20)   # faint static under the line
    tl = nb(post); tl /= np.max(np.abs(tl)) + 1e-9
    out[-post:] += tl * 10 ** (-24 / 20) * np.exp(-np.linspace(0, 6, post))   # squelch tail
    if k == 5:   # distant gunfire, very quiet, under the line
        G = gunfire(); bed = np.zeros(len(out), np.float32); p = int(rng.integers(0, int(.15 * SR)))
        while p < len(out):
            c = G[int(rng.integers(len(G)))]
            c = c[:len(out) - p] * rng.uniform(.5, 1.0)
            bed[p:p + len(c)] += c; p += len(c) + int(rng.uniform(.05, .35) * SR)
        bed = sosfilt(butter(2, [250, 1800], 'bandpass', fs=SR, output='sos'), bed)
        brms = np.sqrt(np.mean(bed ** 2)) + 1e-9
        out += bed * (10 ** (-16 / 20) / brms) * 10 ** (-20 / 20)    # ~20 dB under the voice
    pk = np.max(np.abs(out)); lim = 10 ** (-1 / 20)
    if pk > lim:
        out = np.where(np.abs(out) > lim * .8, np.sign(out) * (lim * .8 + (lim * .2) * np.tanh((np.abs(out) - lim * .8) / (lim * .2))), out)
    f = int(.004 * SR)
    out[-f:] *= np.linspace(1, 0, f)
    return out.astype(np.float32)


def nation(fac, phr, n_takes=3, log=print):
    C = CAST[fac]
    if C['eng'] == 'xtts':   # load XTTS before the scoring models: its checkpoint load peaks at ~2x its size
        from xt import model
        model()
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
                if cry or k in (2, 4, 5):
                    mood = 'cry'      # attack, base alarm, under fire, war cries: shouted over gunfire
                elif k in (3, 7):
                    mood = 'cmd'
                elif k == 6:
                    mood = 'grim'     # unit lost
                else:
                    mood = 'sold'     # select / move: terse
                if mood == 'cry':     # shouted lines end on an exclamation
                    say = re.sub(r'[.。]\s*$', lambda m: '！' if m.group(0).startswith('。') else '!', say.strip())
                voices = C['sold'][lang] if isinstance(C['sold'], dict) else C['sold']
                if k in (3, 4, 7) and not cry:
                    v = C['cmd'][lang] if isinstance(C['cmd'], dict) else C['cmd']
                else:
                    v = voices[(i + (k if cry else 0)) % len(voices)]
                s, w, r, take, ok = best_take(C['eng'], v, lang, say, mood, n_takes, most=C.get('most', 8))
                if not ok and C.get('alt'):   # XTTS kept babbling on this line: the nation's second engine reads it
                    A = C['alt']; av = A['voices'][i % len(A['voices'])]
                    alt = best_take(A['eng'], av, A.get('lang', lang), text if A.get('raw') else say, mood, 3, most=6)
                    if (alt[4], alt[0]) > (ok, s):
                        s, w, r, take, ok = alt; v = av
                if not ok and r['cer'] >= 0.75 and (ent or name == 'c' or i < len(texts) - 1):
                    log(f'{fac} {name}{k} DROPPED (no clean take) | {text} -> {r["hyp"].strip()}')
                    continue   # a garbled variant is left out; the kind keeps its other variants
                w = tough_radio(w, rng, k=-1 if cry else k, semis=C.get('pitch'))
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
