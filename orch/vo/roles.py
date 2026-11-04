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
import tough2 as T2
from roles_lines import R
SR = RN.SR
ROLES = ['inf', 'elite', 'at', 'tank', 'veh', 'pilot', 'navy', 'eng', 'leader']
# per role: speaker slot in the nation's soldier list (or 'cmd'), mood override for select/move, pitch target (Hz) offset
RV = {'inf': (0, None, 0), 'elite': (2, 'grim', 0), 'at': (1, None, 0), 'tank': (1, None, -4), 'veh': (2, None, 0),
      'pilot': ('cmd', 'cmd', 3), 'navy': (0, 'cmd', 0), 'eng': (2, None, 4), 'leader': ('cmd', 'cmd', 2)}
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
                best = None
                for take in range(3):
                    w = RN.trim(RN.synth(C['eng'], v, ln, say, take, mood)); d = len(w) / SR
                    if 0.3 < d <= 1.7 * exp + .45: best = w; break
                    if best is None or abs(d - exp) < abs(len(best) / SR - exp): best = w
                w = proc(best, mood, T2.F0_TARGET['cry' if mood == 'cry' else 'sold'] + dp, rng, k)
                ent.append([round(t, 3), round(len(w) / SR, 3)]); sheet += [w, np.zeros(gap, np.float32)]; t += (len(w) + gap) / SR
                log(f'{fac} {role} {k} {v[:12]} {len(w)/SR:.1f}s | {text}')
            vmap[role].append(ent)
    tmp = os.path.join(RN.CACHE, fac + '_r.sheet.wav'); sf.write(tmp, np.concatenate(sheet), SR)
    dst = os.path.join(ROOT, 'vo', fac + '_r.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '36k', dst], check=True)
    os.makedirs(os.path.join(ROOT, 'tools', 'voices', 'map'), exist_ok=True)
    json.dump(vmap, open(os.path.join(ROOT, 'tools', 'voices', 'map', fac + '_r.json'), 'w'), separators=(',', ':'))
    log(f'{fac}: {t:.0f}s, {os.path.getsize(dst)//1024} KB')
if __name__ == '__main__':
    for f in sys.argv[1:]: nation(f)
