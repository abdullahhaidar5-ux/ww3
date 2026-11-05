#!/usr/bin/env python3
"""Role-based unit voice lines (2026-11-03). Renders vo/<CODE>_r.mp3 (one clip sheet per nation: roles x [select, move, attack])
and tools/voices/map/<CODE>_r.json (offsets) with the SAME engines/settings/radio chain as the approved 'tough2' pass
(tools/voices/tough2.py; speakers/engines from render.CAST). One take per line (sanity-checked on length), formant-kept pitch-down,
T2.voice_chain, static + squelch. Roles/lines: tools/voices/roles_lines.py.
usage: python3 orch/vo/roles.py IR RS DW      (VO_CACHE caches raw takes; reruns only render what is missing)"""
import sys, os, json, re, types, subprocess
import numpy as np, librosa, soundfile as sf
from scipy.signal import butter, sosfilt
for m in ('speechmos', 'speechmos.dnsmos'):
    sys.modules.setdefault(m, types.ModuleType(m))
sys.modules['speechmos'].dnsmos = sys.modules['speechmos.dnsmos']
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(ROOT, 'tools', 'voices'))
import render as RN
import score as SC
import tough2 as T2
import importlib
_LM = importlib.import_module(os.environ.get('VO_LINES', 'roles_lines')); R = _LM.R   # VO_LINES=radio_lines VO_SUF=_h renders the radio/hero callouts instead (2026-11-05)
SUF = os.environ.get('VO_SUF', '_r')
import hashlib, pickle
_TC = {}; _TCF = None
class _CW:   # Whisper read-back cache (reruns over cached takes skip re-transcribing)
    def __init__(s, w): s.w = w
    def transcribe(s, a, **kw):
        k = hashlib.md5(a.astype(np.float32).tobytes() + repr(sorted(kw.items())).encode()).hexdigest()
        if k not in _TC:
            segs, _ = s.w.transcribe(a, **kw)
            _TC[k] = [types.SimpleNamespace(text=g.text, words=[types.SimpleNamespace(word=x.word, end=x.end) for x in (g.words or [])]) for g in segs]
        return _TC[k], None
def _wc():
    global _TCF
    if _TCF is None:
        _TCF = os.path.join(RN.CACHE, 'whisper_rb.pkl')
        if os.path.exists(_TCF): _TC.update(pickle.load(open(_TCF, 'rb')))
    return _CW(_W0())
_W0 = SC._w; SC._w = _wc
SR = RN.SR
ROLES = getattr(_LM, 'ROLES', None) if SUF != '_r' else None
ROLES = ROLES or ['inf', 'elite', 'at', 'tank', 'veh', 'pilot', 'navy', 'eng', 'leader']
# per role: speaker slot in the nation's soldier list (or 'cmd'), mood override for select/move, pitch target (Hz) offset
RV0 = {'inf': (0, None, 0), 'elite': (2, 'grim', 0), 'at': (1, None, 0), 'tank': (1, None, -4), 'veh': (2, None, 0),
      'pilot': ('cmd', 'cmd', 3), 'navy': (0, 'cmd', 0), 'eng': (2, None, 4), 'leader': ('cmd', 'cmd', 2)}
RV = getattr(_LM, 'RV', RV0) if SUF != '_r' else RV0
def proc(w, mood, f0t, rng, kind):
    f0 = float(np.median(librosa.yin(w, fmin=55, fmax=220, sr=SR, frame_length=2048, hop_length=256)))
    semis = float(np.clip(12 * np.log2(max(f0, 1) / f0t), 0, 2.5))
    if semis >= 0.3: w = RN.pitch_down(w, semis)
    w = T2.voice_chain(w, SR, 'cry' if mood == 'cry' else 'sold')
    nb = lambda n: sosfilt(butter(2, [450, 3200], 'bandpass', fs=SR, output='sos'), rng.standard_normal(n))
    pre = int(.07 * SR) if rng.random() < .35 else 0; post = int(.09 * SR)
    out = np.zeros(pre + len(w) + post, np.float32); out[pre:pre + len(w)] = w
    if pre:
        n = nb(pre); n /= np.max(np.abs(n)) + 1e-9; out[:pre] += n * 10 ** (-22 / 20) * np.exp(-np.linspace(0, 5, pre))
    n = nb(len(out)); n /= np.max(np.abs(n)) + 1e-9; out += n * 10 ** ((-46 if rng.random() < .5 else -56) / 20)
    tl = nb(post); tl /= np.max(np.abs(tl)) + 1e-9; out[-post:] += tl * 10 ** (-24 / 20) * np.exp(-np.linspace(0, 6, post))
    pk = np.max(np.abs(out)); lim = 10 ** (-1 / 20)
    if pk > lim: out = np.where(np.abs(out) > lim * .8, np.sign(out) * (lim * .8 + lim * .2 * np.tanh((np.abs(out) - lim * .8) / (lim * .2))), out)
    out[-int(.004 * SR):] *= np.linspace(1, 0, int(.004 * SR)); return out.astype(np.float32)
def ko_cut(w, say, wl):
    """cut a babbling take right after the words that best match the line (Whisper word timestamps); None if no prefix matches."""
    w16 = np.clip(librosa.resample(w, orig_sr=SR, target_sr=16000), -1, 1)
    segs, _ = SC._w().transcribe(w16, language=wl, beam_size=1, word_timestamps=True)
    words = [x for sg in segs for x in (sg.words or [])]; txt = ''; bc = None
    for x in words:
        txt += x.word; c = SC.cer(say, txt)
        if bc is None or c < bc[0]: bc = (c, x.end)
    if bc is None or bc[0] > 0.5: return None
    e = min(len(w), int((bc[1] + 0.12) * SR)); out = w[:e].copy(); f = min(len(out), int(.03 * SR))
    out[-f:] *= np.linspace(1, 0, f); return out
def nation(fac, log=print):
    C = RN.CAST[fac]; L = R[fac]; lang = C['lang']
    if C['eng'] == 'xtts':
        from xt import model; model()
    rng = np.random.default_rng(sum(map(ord, fac)) + 3); sheet = []; t = 0.0; gap = int(.12 * SR); vmap = {}
    for role in ROLES:
        slot, mood_o, dp = RV[role]; vmap[role] = []
        for k, texts in enumerate(L[role]):
            ent = []
            for i, item in enumerate(texts):
                ln, text = item if isinstance(item, tuple) else (lang, item)
                mood = 'cry' if k == 2 else (mood_o or 'sold')
                say = RN.TRANSLIT.get(text, text)
                if mood == 'cry': say = re.sub(r'[.。]\s*$', '!', say.strip())
                if C['eng'] == 'mix':
                    v = C['cmd'] if slot == 'cmd' else C['sold'][(ROLES.index(role) + i) % len(C['sold'])]
                else:
                    sv = C['sold'][ln] if isinstance(C['sold'], dict) else C['sold']
                    v = (C['cmd'][ln] if isinstance(C['cmd'], dict) else C['cmd']) if slot == 'cmd' else sv[(slot + i) % len(sv)]
                exp = 0.35 + 0.075 * len(re.sub(r'\s', '', say)) * (2.2 if ln in ('zh-cn', 'ko') else 1)
                best = None; bk = None
                wl = {'zh-cn': 'zh'}.get(ln, ln)
                nch = len(re.sub(r'\s', '', say))
                for take in range(int(os.environ.get('VO_TAKES', 0)) or (4 if ln == 'hi' else 5)):   # ko (2026-11-04 speed fix): stop after 2 takes unless the read-back is clearly wrong
                       # QC: Whisper read-back; XTTS sometimes babbles on short lines (long tail / wrong words)
                    w = RN.trim(RN.synth(C['eng'], v, ln, say, take, mood)); d = len(w) / SR
                    if ln == 'hi':   # Whisper-small can't read short Hindi/Urdu radio lines: judge by length only (babble runs long)
                        key = (d if d >= 0.25 + 0.04 * nch else d + 10, take)
                        if bk is None or key < bk: bk, best = key, w
                        continue
                    w16 = np.clip(librosa.resample(w, orig_sr=SR, target_sr=16000), -1, 1)
                    segs, _ = SC._w().transcribe(w16, language=wl, beam_size=1)
                    c = SC.cer(say, ''.join(x.text for x in segs))
                    long_ = d > max(2.6, 2.0 * exp + .6)
                    key = (c + (1.0 if long_ else 0) + (1.0 if d < 0.3 else 0), take)
                    if bk is None or key < bk: bk, best = key, w
                    if c <= (0.6 if ln == 'ko' else 0.34) and not long_ and d >= 0.3: break
                    if ln == 'ko' and take >= 1 and bk[0] < 1.0: break   # ko: re-try only a clearly wrong read-back (babble / wrong words)
                if ln == 'ko' and bk[0] >= 1.0:   # still wrong after retries: XTTS usually says the line, then babbles -> cut after the line
                    for take in range(5):
                        w = RN.trim(RN.synth(C['eng'], v, ln, say, take, mood)); tw = ko_cut(w, say, wl)
                        if tw is None: continue
                        w16 = np.clip(librosa.resample(tw, orig_sr=SR, target_sr=16000), -1, 1)   # re-verify the cut take
                        c = SC.cer(say, ''.join(x.text for x in SC._w().transcribe(w16, language=wl, beam_size=1)[0])); d = len(tw) / SR
                        key = (c + (1.0 if d > max(2.6, 2.0 * exp + .6) else 0) + (1.0 if d < 0.3 else 0), take + 10)
                        if key < bk: bk, best = key, tw
                if ln == 'ko' and bk[0] >= 2.0 and slot != 'cmd':   # long AND wrong even after the cut: let the nation's other soldier voice say it
                    va = sv[(slot + i + 1) % len(sv)]
                    for take in range(3):
                        w = RN.trim(RN.synth(C['eng'], va, ln, say, take, mood))
                        for tw in (w, ko_cut(w, say, wl)):
                            if tw is None: continue
                            w16 = np.clip(librosa.resample(tw, orig_sr=SR, target_sr=16000), -1, 1); d = len(tw) / SR
                            c = SC.cer(say, ''.join(x.text for x in SC._w().transcribe(w16, language=wl, beam_size=1)[0]))
                            key = (c + (1.0 if d > max(2.6, 2.0 * exp + .6) else 0) + (1.0 if d < 0.3 else 0), take + 20)
                            if key < bk: bk, best, v = key, tw, va
                        if bk[0] < 1.0: break
                log(f'   qc cer/penalised {bk[0]:.2f} take {bk[1]}')
                w = proc(best, mood, T2.F0_TARGET['cry' if mood == 'cry' else 'sold'] + dp, rng, k)
                ent.append([round(t, 3), round(len(w) / SR, 3)]); sheet += [w, np.zeros(gap, np.float32)]; t += (len(w) + gap) / SR
                if _TCF: pickle.dump(_TC, open(_TCF, 'wb'))
                log(f'{fac} {role} {k} {v[:12]} {len(w)/SR:.1f}s | {text}')
            vmap[role].append(ent)
    tmp = os.path.join(RN.CACHE, fac + SUF + '.sheet.wav'); sf.write(tmp, np.concatenate(sheet), SR)
    dst = os.path.join(ROOT, 'vo', fac + SUF + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '36k', dst], check=True)
    os.makedirs(os.path.join(ROOT, 'tools', 'voices', 'map'), exist_ok=True)
    json.dump(vmap, open(os.path.join(ROOT, 'tools', 'voices', 'map', fac + SUF + '.json'), 'w'), separators=(',', ':'))
    log(f'{fac}: {t:.0f}s, {os.path.getsize(dst)//1024} KB')
if __name__ == '__main__':
    for f in sys.argv[1:]: nation(f)
