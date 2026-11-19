#!/usr/bin/env python3
"""orch/out-v3/sample.mp3 for Abdullah's phone (voices3): for FR, DE and GB the same 3 kinds of line (select, attack, under
fire) first with the voices main plays now, one beep, then the new voices; a double beep between nations; then 4 new JP lines
(select, move, attack, unit ready) and 3 Hebrew announcer lines. Old sheets come from git (origin/main).
usage: python3 orch/vo/v3sample.py"""
import os, json, subprocess, numpy as np, librosa, soundfile as sf
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SR = 24000; TMP = '/tmp/v3sample'; os.makedirs(TMP, exist_ok=True)
PICK = {'FR': [('l', 0, 2), ('l', 2, 1), ('l', 5, 1)], 'DE': [('l', 0, 1), ('l', 2, 1), ('l', 5, 0)],
        'GB': [('l', 0, 1), ('l', 2, 0), ('l', 5, 2)], 'JP': [('l', 0, 0), ('l', 1, 0), ('l', 2, 1), ('l', 3, 1)]}
ANN = ['baseAtk', 'complete', 'lineCut']

def git(path, out):
    with open(out, 'wb') as f: subprocess.run(['git', '-C', ROOT, 'show', 'origin/main:' + path], stdout=f, check=True)
    return out

def sil(s): return np.zeros(int(s * SR), np.float32)
def beep(n=1):
    k = int(.18 * SR); b = (0.3 * np.sin(2 * np.pi * 1000 * np.arange(k) / SR)).astype(np.float32); f = int(.01 * SR)
    b[:f] *= np.linspace(0, 1, f); b[-f:] *= np.linspace(1, 0, f)
    return np.concatenate([np.concatenate([b, sil(.12)]) for _ in range(n)])

def block(mp3, mp, pick):
    a, _ = librosa.load(mp3, sr=SR); m = json.load(open(mp)); out = []
    for g, k, i in pick:
        e = m[g][k]; t, d = e[min(i, len(e) - 1)]; out += [a[int(t * SR):int((t + d) * SR)], sil(.35)]
    return np.concatenate(out)

parts = [sil(.2)]
for fac in ('FR', 'DE', 'GB'):
    old = block(git(f'vo/{fac}.mp3', f'{TMP}/{fac}_old.mp3'), git(f'tools/voices/map/{fac}.json', f'{TMP}/{fac}_old.json'), PICK[fac])
    new = block(os.path.join(ROOT, 'vo', fac + '.mp3'), os.path.join(ROOT, 'tools', 'voices', 'map', fac + '.json'), PICK[fac])
    parts += [beep(2), sil(.3), old, beep(1), sil(.3), new, sil(.3)]
parts += [beep(2), sil(.3), block(os.path.join(ROOT, 'vo', 'JP.mp3'), os.path.join(ROOT, 'tools', 'voices', 'map', 'JP.json'), PICK['JP'])]
js = open(os.path.join(ROOT, 'src', '09d-announcer.js'), encoding='utf-8').read()
import re
off = json.loads(re.search(r'const ANN_OFF=(\{.*?\}\});', js).group(1)).get('he')
if off:
    a, _ = librosa.load(os.path.join(ROOT, 'vo', 'ann_he.mp3'), sr=SR)
    parts += [beep(2), sil(.3)] + [x for k in ANN for x in (a[int(off[k][0] * SR):int((off[k][0] + off[k][1]) * SR)], sil(.4))]
w = np.concatenate(parts)
os.makedirs(os.path.join(ROOT, 'orch', 'out-v3'), exist_ok=True)
sf.write(f'{TMP}/s.wav', w, SR)
dst = os.path.join(ROOT, 'orch', 'out-v3', 'sample.mp3')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{TMP}/s.wav', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', dst], check=True)
print(dst, round(len(w) / SR, 1), 's')
